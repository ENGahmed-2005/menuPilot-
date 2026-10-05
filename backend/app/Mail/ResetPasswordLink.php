<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

/** Password reset e-mail (Arabic). The link is valid for 60 minutes. */
class ResetPasswordLink extends Mailable
{
    use Queueable;

    public function __construct(public string $name, public string $link) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: 'إعادة تعيين كلمة المرور — menuPilot');
    }

    public function content(): Content
    {
        $name = e($this->name);
        $link = e($this->link);

        return new Content(htmlString: <<<HTML
<div dir="rtl" style="font-family:Tahoma,Arial,sans-serif;font-size:15px;line-height:1.8;color:#182920">
  <p>مرحبًا {$name}،</p>
  <p>وصلنا طلب لإعادة تعيين كلمة مرور حسابك في menuPilot. اضغط الزر لاختيار كلمة مرور جديدة. الرابط صالح لمدة 60 دقيقة.</p>
  <p><a href="{$link}" style="display:inline-block;background:#e67e22;color:#182920;padding:12px 22px;border-radius:10px;text-decoration:none;font-weight:bold">إعادة تعيين كلمة المرور</a></p>
  <p style="color:#5a6860;font-size:13px">إذا لم تطلب ذلك فتجاهل هذه الرسالة، ولن يتغير شيء في حسابك.</p>
</div>
HTML);
    }
}
