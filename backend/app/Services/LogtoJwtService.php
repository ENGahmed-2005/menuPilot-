<?php

namespace App\Services;

use RuntimeException;

class LogtoJwtService
{
    private ?array $jwks = null;

    public function validate(string $jwt, string $audience): array
    {
        $parts = explode('.', $jwt);
        if (count($parts) !== 3) throw new RuntimeException('Invalid Logto token.');

        [$encodedHeader, $encodedPayload, $encodedSignature] = $parts;
        $header = json_decode($this->base64UrlDecode($encodedHeader), true);
        $payload = json_decode($this->base64UrlDecode($encodedPayload), true);
        $signature = $this->base64UrlDecode($encodedSignature);

        if (!is_array($header) || !is_array($payload) || !$signature) throw new RuntimeException('Invalid Logto token payload.');
        if (($header['alg'] ?? null) !== 'RS256' || empty($header['kid'])) throw new RuntimeException('Unsupported Logto signing algorithm.');

        $issuer = rtrim((string) config('services.logto.issuer'), '/');
        if (!$issuer || ($payload['iss'] ?? null) !== $issuer) throw new RuntimeException('Invalid Logto token issuer.');

        if (empty($payload['exp']) || (int) $payload['exp'] < time()) throw new RuntimeException('Logto token has expired.');

        $aud = $payload['aud'] ?? [];
        $audiences = is_array($aud) ? $aud : [$aud];
        if (!in_array($audience, $audiences, true)) throw new RuntimeException('Invalid Logto token audience.');

        $jwk = $this->findKey((string) $header['kid']);
        $pem = $this->jwkToPem($jwk);
        $verified = openssl_verify($encodedHeader.'.'.$encodedPayload, $signature, $pem, OPENSSL_ALGO_SHA256);

        if ($verified !== 1) throw new RuntimeException('Invalid Logto token signature.');

        return $payload;
    }

    private function findKey(string $kid): array
    {
        if ($this->jwks === null) {
            $uri = config('services.logto.jwks_uri');
            $json = @file_get_contents($uri);
            if ($json === false) throw new RuntimeException('Unable to fetch Logto signing keys.');
            $data = json_decode($json, true);
            if (!isset($data['keys']) || !is_array($data['keys'])) throw new RuntimeException('Invalid Logto JWKS response.');
            $this->jwks = $data['keys'];
        }

        foreach ($this->jwks as $key) {
            if (($key['kid'] ?? null) === $kid && ($key['kty'] ?? null) === 'RSA') return $key;
        }

        throw new RuntimeException('Logto signing key not found.');
    }

    private function jwkToPem(array $jwk): string
    {
        $modulus = $this->base64UrlDecode($jwk['n'] ?? '');
        $exponent = $this->base64UrlDecode($jwk['e'] ?? '');
        if ($modulus === '' || $exponent === '') throw new RuntimeException('Invalid RSA signing key.');

        $rsaPublicKey = $this->derSequence(
            $this->derInteger($modulus).$this->derInteger($exponent)
        );

        $algorithmIdentifier = hex2bin('300d06092a864886f70d0101010500');
        $subjectPublicKey = $this->derBitString($rsaPublicKey);
        $der = $this->derSequence($algorithmIdentifier.$subjectPublicKey);

        return "-----BEGIN PUBLIC KEY-----\n".
            chunk_split(base64_encode($der), 64, "\n").
            "-----END PUBLIC KEY-----\n";
    }

    private function derInteger(string $value): string
    {
        if (ord($value[0]) & 0x80) $value = "\0".$value;
        return "\x02".$this->derLength(strlen($value)).$value;
    }

    private function derBitString(string $value): string
    {
        return "\x03".$this->derLength(strlen($value)+1)."\0".$value;
    }

    private function derSequence(string $value): string
    {
        return "\x30".$this->derLength(strlen($value)).$value;
    }

    private function derLength(int $length): string
    {
        if ($length < 128) return chr($length);
        $bytes = '';
        while ($length > 0) {
            $bytes = chr($length & 0xff).$bytes;
            $length >>= 8;
        }
        return chr(0x80 | strlen($bytes)).$bytes;
    }

    private function base64UrlDecode(string $value): string
    {
        $value = strtr($value, '-_', '+/');
        $padding = strlen($value) % 4;
        if ($padding) $value .= str_repeat('=', 4 - $padding);
        $decoded = base64_decode($value, true);
        return $decoded === false ? '' : $decoded;
    }
}
