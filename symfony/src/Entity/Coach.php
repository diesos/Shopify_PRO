<?php

namespace App\Entity;

use ApiPlatform\Metadata\ApiResource;
use App\Repository\CoachRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Serializer\Attribute\Groups;

#[ORM\Entity(repositoryClass: CoachRepository::class)]
#[ApiResource(
    normalizationContext: ['groups' => ['coach:read']],
    denormalizationContext: ['groups' => ['coach:write']],
)]
class Coach
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    #[Groups(['coach:read'])]
    private ?int $id = null;

    #[ORM\Column(length: 255)]
    #[Groups(['coach:read', 'coach:write'])]
    private ?string $firstName = null;

    #[ORM\Column(length: 255)]
    #[Groups(['coach:read', 'coach:write'])]
    private ?string $lastName = null;

    #[ORM\Column(length: 255)]
    #[Groups(['coach:read', 'coach:write'])]
    private ?string $phone = null;

    #[ORM\Column(length: 255)]
    #[Groups(['coach:read', 'coach:write'])]
    private ?string $email = null;

    #[ORM\Column(type: Types::TEXT)]
    #[Groups(['coach:write'])]
    private ?string $password = null;

    #[ORM\Column]
    #[Groups(['coach:read', 'coach:write'])]
    private ?int $pricePerHour = null;

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getFirstName(): ?string
    {
        return $this->firstName;
    }

    public function setFirstName(string $firstName): static
    {
        $this->firstName = $firstName;

        return $this;
    }

    public function getLastName(): ?string
    {
        return $this->lastName;
    }

    public function setLastName(string $lastName): static
    {
        $this->lastName = $lastName;

        return $this;
    }

    public function getPhone(): ?string
    {
        return $this->phone;
    }

    public function setPhone(string $phone): static
    {
        $this->phone = $phone;

        return $this;
    }

    public function getEmail(): ?string
    {
        return $this->email;
    }

    public function setEmail(string $email): static
    {
        $this->email = $email;

        return $this;
    }

    public function getPassword(): ?string
    {
        return $this->password;
    }

    public function setPassword(string $password): static
    {
        $this->password = $password;

        return $this;
    }

    public function getPricePerHour(): ?int
    {
        return $this->pricePerHour;
    }

    public function setPricePerHour(int $pricePerHour): static
    {
        $this->pricePerHour = $pricePerHour;

        return $this;
    }
}
