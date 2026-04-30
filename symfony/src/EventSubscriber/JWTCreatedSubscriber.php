<?php

declare(strict_types=1);

namespace App\EventSubscriber;

use App\Entity\User;
use Lexik\Bundle\JWTAuthenticationBundle\Event\JWTCreatedEvent;
use Lexik\Bundle\JWTAuthenticationBundle\Events;
use Symfony\Component\EventDispatcher\EventSubscriberInterface;

/**
 * Enriches the Lexik JWT payload with user identity fields so the frontend
 * can hydrate its auth state directly from the token (no extra /api/me call
 * on bootstrap), while /api/me remains the source of truth for refreshes.
 */
final class JWTCreatedSubscriber implements EventSubscriberInterface
{
    public static function getSubscribedEvents(): array
    {
        return [Events::JWT_CREATED => 'onJWTCreated'];
    }

    public function onJWTCreated(JWTCreatedEvent $event): void
    {
        $user = $event->getUser();

        if (!$user instanceof User) {
            return;
        }

        $payload = $event->getData();
        $payload['id'] = $user->getId();
        $payload['firstName'] = $user->getFirstName();
        $payload['lastName'] = $user->getLastName();

        $event->setData($payload);
    }
}
