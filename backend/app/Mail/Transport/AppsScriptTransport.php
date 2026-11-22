<?php

namespace App\Mail\Transport;

use Illuminate\Support\Facades\Http;
use Symfony\Component\Mailer\Exception\TransportException;
use Symfony\Component\Mailer\SentMessage;
use Symfony\Component\Mailer\Transport\AbstractTransport;
use Symfony\Component\Mime\MessageConverter;

/**
 * Sends Laravel mail through a small Google Apps Script Web App that calls
 * MailApp.sendEmail from the owner's Gmail account (docs/mail-relay/).
 *
 * Why: Render's free plan blocks outbound SMTP (ports 25/465/587), and this
 * works over HTTPS (443) with no domain and no card. The message leaves from
 * the script owner's Gmail address (MAIL_FROM_ADDRESS is not used; only the
 * display name is). Gmail accounts allow 100 recipients per day via MailApp.
 *
 * MAIL_MAILER=appsscript, APPS_SCRIPT_MAIL_URL=https://script.google.com/macros/s/…/exec,
 * APPS_SCRIPT_MAIL_SECRET=<same value as the script property MAIL_SECRET>.
 */
class AppsScriptTransport extends AbstractTransport
{
    public function __construct(private string $url, private string $secret)
    {
        parent::__construct();
    }

    protected function doSend(SentMessage $message): void
    {
        if ($this->url === '' || $this->secret === '') {
            throw new TransportException('APPS_SCRIPT_MAIL_URL or APPS_SCRIPT_MAIL_SECRET is not set.');
        }

        $email = MessageConverter::toEmail($message->getOriginalMessage());
        $name = ($email->getFrom()[0] ?? null)?->getName();
        $reply = ($email->getReplyTo()[0] ?? null)?->getAddress();

        // One request per recipient so nobody sees another recipient's address.
        foreach ($message->getEnvelope()->getRecipients() as $recipient) {
            $payload = array_filter([
                'secret' => $this->secret,
                'to' => $recipient->getAddress(),
                'subject' => (string) $email->getSubject(),
                'text' => $email->getTextBody() ? (string) $email->getTextBody() : null,
                'html' => $email->getHtmlBody() ? (string) $email->getHtmlBody() : null,
                'name' => $name ?: null,
                'replyTo' => $reply,
            ], fn ($v) => $v !== null && $v !== '');

            // Apps Script answers a POST with a 302 to the result; the HTTP client follows it.
            $response = Http::acceptJson()->asJson()->timeout(20)->post($this->url, $payload);

            if ($response->json('ok') !== true) {
                $detail = $response->json('error')
                    ?? 'unexpected response (HTTP '.$response->status().'); deploy the Web App with access "Anyone"';

                throw new TransportException('Apps Script: '.$detail);
            }
        }
    }

    public function __toString(): string
    {
        return 'appsscript+https://script.google.com';
    }
}
