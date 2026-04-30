<?php

namespace App\Tests\Api;

use App\Entity\Coach;
use Symfony\Component\HttpFoundation\Response;

final class CoachApiTest extends AbstractApiTestCase
{
    public function testListCoachesIsPublic(): void
    {
        static::createClient()->request('GET', '/api/coaches');

        $this->assertResponseIsSuccessful();
    }

    public function testCreateCoachRequiresAuth(): void
    {
        static::createClient()->request('POST', '/api/coaches', [
            'headers' => ['Content-Type' => 'application/json'],
            'json' => $this->coachPayload(),
        ]);

        $this->assertResponseStatusCodeSame(Response::HTTP_UNAUTHORIZED);
    }

    public function testCreateCoachAsAdmin(): void
    {
        $this->createUser('admin@test.com', 'admin123', ['ROLE_ADMIN']);

        $client = $this->authenticatedClient('admin@test.com', 'admin123');
        $client->request('POST', '/api/coaches', [
            'headers' => ['Content-Type' => 'application/json'],
            'json' => $this->coachPayload(),
        ]);

        $this->assertResponseStatusCodeSame(Response::HTTP_CREATED);
        $this->assertJsonContains(['firstName' => 'Sophie', 'email' => 'sophie@coach.com']);
    }

    public function testCreateCoachAsClientIsForbidden(): void
    {
        $this->createUser('jean@test.com');

        $client = $this->authenticatedClient('jean@test.com');
        $client->request('POST', '/api/coaches', [
            'headers' => ['Content-Type' => 'application/json'],
            'json' => $this->coachPayload(),
        ]);

        $this->assertResponseStatusCodeSame(Response::HTTP_FORBIDDEN);
    }

    public function testCreateCoachRejectsDuplicateEmail(): void
    {
        $this->createUser('admin@test.com', 'admin123', ['ROLE_ADMIN']);
        $client = $this->authenticatedClient('admin@test.com', 'admin123');

        $client->request('POST', '/api/coaches', [
            'headers' => ['Content-Type' => 'application/json'],
            'json' => $this->coachPayload(),
        ]);
        $this->assertResponseStatusCodeSame(Response::HTTP_CREATED);

        $client->request('POST', '/api/coaches', [
            'headers' => ['Content-Type' => 'application/json'],
            'json' => $this->coachPayload(),
        ]);
        $this->assertResponseStatusCodeSame(Response::HTTP_UNPROCESSABLE_ENTITY);
    }

    public function testGetCoachById(): void
    {
        $coach = (new Coach())
            ->setFirstName('Sophie')
            ->setLastName('Martin')
            ->setPhone('0612345678')
            ->setEmail('sophie@coach.com')
            ->setPassword('hashed')
            ->setPricePerHour(50);
        $this->em->persist($coach);
        $this->em->flush();

        static::createClient()->request('GET', '/api/coaches/'.$coach->getId());

        $this->assertResponseIsSuccessful();
        $this->assertJsonContains(['firstName' => 'Sophie']);
    }

    private function coachPayload(): array
    {
        return [
            'firstName' => 'Sophie',
            'lastName' => 'Martin',
            'email' => 'sophie@coach.com',
            'phone' => '0612345678',
            'password' => 'coachpass',
            'pricePerHour' => 50,
        ];
    }
}
