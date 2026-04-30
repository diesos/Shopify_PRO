<?php

namespace App\Tests\Api;

use App\Entity\Seance;
use Symfony\Component\HttpFoundation\Response;

final class SeanceApiTest extends AbstractApiTestCase
{
    public function testListSeancesIsPublic(): void
    {
        static::createClient()->request('GET', '/api/seances');

        $this->assertResponseIsSuccessful();
    }

    public function testCreateSeanceRequiresAuth(): void
    {
        static::createClient()->request('POST', '/api/seances', [
            'headers' => ['Content-Type' => 'application/json'],
            'json' => $this->seancePayload(),
        ]);

        $this->assertResponseStatusCodeSame(Response::HTTP_UNAUTHORIZED);
    }

    public function testCreateSeanceAsAdmin(): void
    {
        $this->createUser('admin@test.com', 'admin123', ['ROLE_ADMIN']);

        $client = $this->authenticatedClient('admin@test.com', 'admin123');
        $client->request('POST', '/api/seances', [
            'headers' => ['Content-Type' => 'application/json'],
            'json' => $this->seancePayload(),
        ]);

        $this->assertResponseStatusCodeSame(Response::HTTP_CREATED);
        $this->assertJsonContains(['name' => 'Yoga matinal']);
    }

    public function testCreateSeanceAsCoach(): void
    {
        $this->createUser('coach@test.com', 'coachpass', ['ROLE_COACH']);

        $client = $this->authenticatedClient('coach@test.com', 'coachpass');
        $client->request('POST', '/api/seances', [
            'headers' => ['Content-Type' => 'application/json'],
            'json' => $this->seancePayload(),
        ]);

        $this->assertResponseStatusCodeSame(Response::HTTP_CREATED);
    }

    public function testCreateSeanceAsClientIsForbidden(): void
    {
        $this->createUser('jean@test.com');

        $client = $this->authenticatedClient('jean@test.com');
        $client->request('POST', '/api/seances', [
            'headers' => ['Content-Type' => 'application/json'],
            'json' => $this->seancePayload(),
        ]);

        $this->assertResponseStatusCodeSame(Response::HTTP_FORBIDDEN);
    }

    public function testGetSeanceById(): void
    {
        $seance = (new Seance())
            ->setName('Yoga matinal')
            ->setCoachId(1)
            ->setMaxUser(10)
            ->setStartTime(new \DateTime('2026-05-15T09:00:00+02:00'))
            ->setEndTime(new \DateTime('2026-05-15T10:00:00+02:00'));
        $this->em->persist($seance);
        $this->em->flush();

        static::createClient()->request('GET', '/api/seances/'.$seance->getId());

        $this->assertResponseIsSuccessful();
        $this->assertJsonContains(['name' => 'Yoga matinal']);
    }

    private function seancePayload(): array
    {
        return [
            'name' => 'Yoga matinal',
            'coachId' => 1,
            'maxUser' => 10,
            'startTime' => '2026-05-15T09:00:00+02:00',
            'endTime' => '2026-05-15T10:00:00+02:00',
        ];
    }
}
