<?php

namespace App\Entity;

use ApiPlatform\Metadata\ApiResource;
use App\Repository\CoachRepository;
use App\State\PasswordHasherProcessor;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\Validator\Constraints\UniqueEntity;
use Symfony\Component\Security\Core\User\PasswordAuthenticatedUserInterface;
use Symfony\Component\Serializer\Attribute\Groups;
use Symfony\Component\Validator\Constraints as Assert;

#[ORM\Entity(repositoryClass: CoachRepository::class)]
#[ApiResource(
    normalizationContext: ['groups' => ['coach:read']],
    denormalizationContext: ['groups' => ['coach:write']],
    processor: PasswordHasherProcessor::class,
)]
#[UniqueEntity(fields: ['email'], message: 'Cet email est déjà utilisé.')]
class Coach implements PasswordAuthenticatedUserInterface
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    #[Groups(['coach:read'])]
    private ?int $id = null;

    #[ORM\Column(length: 255)]
    #[Groups(['coach:read', 'coach:write'])]
    #[Assert\NotBlank]
    private ?string $firstName = null;

    #[ORM\Column(length: 255)]
    #[Groups(['coach:read', 'coach:write'])]
    #[Assert\NotBlank]
    private ?string $lastName = null;

    #[ORM\Column(length: 255)]
    #[Groups(['coach:read', 'coach:write'])]
    #[Assert\NotBlank]
    private ?string $phone = null;

    #[ORM\Column(length: 180, unique: true)]
    #[Groups(['coach:read', 'coach:write'])]
    #[Assert\NotBlank]
    #[Assert\Email]
    private ?string $email = null;

    #[ORM\Column(type: Types::TEXT)]
    #[Groups(['coach:write'])]
    #[Assert\NotBlank]
    #[Assert\Length(min: 6, minMessage: 'Le mot de passe doit faire au moins {{ limit }} caractères.')]
    private ?string $password = null;

    #[ORM\Column]
    #[Groups(['coach:read', 'coach:write'])]
    #[Assert\NotNull]
    #[Assert\Positive]
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
