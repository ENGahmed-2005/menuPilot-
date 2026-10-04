<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;

/**
 * "Something on this topic changed": screens refetch through the API they
 * already use, so no data travels on the channel. Sent right away (no queue
 * worker needed).
 */
class RealtimeSignal implements ShouldBroadcastNow
{
    public function __construct(public string $channel, public bool $private, public string $topic) {}

    public function broadcastOn(): array
    {
        return [$this->private ? new PrivateChannel($this->channel) : new Channel($this->channel)];
    }

    public function broadcastAs(): string
    {
        return 'signal';
    }

    public function broadcastWith(): array
    {
        return ['topic' => $this->topic];
    }
}
