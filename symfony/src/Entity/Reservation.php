<?php

namespace App\Entity;

use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Delete;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use ApiPlatform\Metadata\Post;
use App\Repository\ReservationRepository;
use App\Validator\ReservationConstraints;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Serializer\Attribute\Groups;
use Symfony\Component\Validator\Constraints as Assert;

#[ORM\Entity(repositoryClass: ReservationRepository::class)]
#[ApiResource(
    normalizationContext: ['groups' => ['reservation:read']],
    denormalizationContext: ['groups' => ['reservation:write']],
    operations: [
        new GetCollection(security: "is_granted('IS_AUTHENTICATED_FULLY')"),
        new Get(security: "is_granted('ROLE_ADMIN') or is_granted('ROLE_COACH') or object.getUser() == user"),
        new Post(security: "is_granted('IS_AUTHENTICATED_FULLY')"),
        new Delete(security: "is_granted('ROLE_ADMIN') or is_granted('ROLE_COACH') or object.getUser() == user"),
    ],
)]
#[ReservationConstraints]
class Reservation
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    #[Groups(['reservation:read'])]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(name: 'user_id', referencedColumnName: 'id', nullable: false)]
    #[Groups(['reservation:read', 'reservation:write'])]
    #[Assert\NotNull]
    private ?User $user = null;

    #[ORM\ManyToOne(targetEntity: Seance::class)]
    #[ORM\JoinColumn(name: 'seance_id', referencedColumnName: 'id', nullable: false)]
    #[Groups(['reservation:read', 'reservation:write'])]
    #[Assert\NotNull]
    private ?Seance $seance = null;

    #[ORM\Column]
    #[Groups(['reservation:read', 'reservation:write'])]
    #[Assert\NotNull]
    private ?\DateTime $reservationTime = null;

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getUser(): ?User
    {
        return $this->user;
    }

    public function setUser(?User $user): static
    {
        $this->user = $user;

        return $this;
    }

    public function getSeance(): ?Seance
    {
        return $this->seance;
    }

    public function setSeance(?Seance $seance): static
    {
        $this->seance = $seance;

        return $this;
    }

    public function getReservationTime(): ?\DateTime
    {
        return $this->reservationTime;
    }

    public function setReservationTime(\DateTime $reservationTime): static
    {
        $this->reservationTime = $reservationTime;

        return $this;
    }
}
