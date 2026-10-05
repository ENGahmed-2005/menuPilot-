<?php

namespace App\Mail\Transport;

use Illuminate\Support\Facades\Http;
use Symfony\Component\Mailer\Exception\TransportException;
use Symfony\Component\Mailer\SentMessage;
use Symfony\Component\Mailer\Transport\AbstractTransport;
use Symfony\Component\Mime\Address;
use Symfony\Component\Mime\MessageConverter;

/**
 * Sends Laravel mail through the MailerSend HTTP API with an API token
 * (MAIL_MAILER=mailersend, MAILERSEND_API_KEY=mlsn...). No extra package:
 * one POST to /v1/email. Errors from MailerSend are surfaced verbatim so
 * `php artisan menupilot:test-mail` shows the real reason.
 */
class MailerSendTransport extends AbstractTransport
{
    public function __construct(private string $apiKey, private string $endpoint = 'https://api.mailersend.com/v1/email')
    {
        parent::__construct();
    }

    protected function doSend(SentMessage $message): void
    {
        if ($this->apiKey === '') {
            throw new TransportException('MAILERSEND_API_KEY is not set.');
        }

        $email = MessageConverter::toEmail($message->getOriginalMessage());
        $from = $email->getFrom()[0] ?? $message->getEnvelope()->getSender();
        $map = fn (Address $a) => array_filter(['email' => $a->getAddress(), 'name' => $a->getName() ?: null]);

        $payload = array_filter([
            'from' => $map($from),
            'to' => array_map($map, $message->getEnvelope()->getRecipients()),
            'reply_to' => ($reply = $email->getReplyTo()[0] ?? null) ? $map($reply) : null,
            'subject' => (string) $email->getSubject(),
            'text' => $email->getTextBody() ? (string) $email->getTextBody() : null,
            'html' => $email->getHtmlBody() ? (string) $email->getHtmlBody() : null,
        ], fn ($v) => $v !== null && $v !== []);

        $response = Http::withToken($this->apiKey)->acceptJson()->timeout(15)->post($this->endpoint, $payload);

        if (! $response->successful()) {
            $detail = $response->json('message') ?? $response->body();
            $errors = $response->json('errors');
            throw new TransportException(sprintf('MailerSend %d: %s%s', $response->status(), $detail, $errors ? ' '.json_encode($errors, JSON_UNESCAPED_UNICODE) : ''));
        }
    }

    public function __toString(): string
    {
        return 'mailersend+api://api.mailersend.com';
    }
}
