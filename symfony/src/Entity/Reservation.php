<?php

namespace App\Entity;

use ApiPlatform\Metadata\ApiResource;
use App\Repository\ReservationRepository;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: ReservationRepository::class)]
#[ApiResource]
class Reservation
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column]
    private ?int $userId = null;

    #[ORM\Column]
    private ?int $seanceId = null;

    #[ORM\Column]
    private ?\DateTime $reservationTime = null;

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getUserId(): ?int
    {
        return $this->userId;
    }

    public function setUserId(int $userId): static
    {
        $this->userId = $userId;

        return $this;
    }

    public function getSeanceId(): ?int
    {
        return $this->seanceId;
    }

    public function setSeanceId(int $seanceId): static
    {
        $this->seanceId = $seanceId;

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
