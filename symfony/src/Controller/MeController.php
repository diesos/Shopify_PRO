<?php

declare(strict_types=1);

namespace App\Controller;

use App\Entity\User;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;
use Symfony\Component\Serializer\SerializerInterface;

/**
 * GET /api/me — returns the currently authenticated user.
 *
 * Reuses the existing `user:read` normalization group defined on the User
 * entity, so no DTO is duplicated. The route is protected by the firewall
 * (^/api → IS_AUTHENTICATED_FULLY) and additionally guarded here.
 */
final class MeController extends AbstractController
{
    public function __construct(private readonly SerializerInterface $serializer)
    {
    }

    #[Route('/api/me', name: 'api_me', methods: ['GET'])]
    #[IsGranted('IS_AUTHENTICATED_FULLY')]
    public function __invoke(): JsonResponse
    {
        $user = $this->getUser();

        if (!$user instanceof User) {
            return new JsonResponse(['error' => 'Unauthorized'], JsonResponse::HTTP_UNAUTHORIZED);
        }

        $payload = $this->serializer->serialize($user, 'json', [
            'groups' => ['user:read'],
        ]);

        return JsonResponse::fromJsonString($payload);
    }
}
