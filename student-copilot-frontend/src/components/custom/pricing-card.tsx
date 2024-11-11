import React from 'react';
import { Button } from '@/components/ui/button'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

// Define the PricingCardProps interface
interface PricingCardProps {
  title: string;
  price: number;
  description: string;
  features: string[];
  buttonText: string;
  isPopular?: boolean;
}

// Use the PricingCardProps in the component definition
const PricingCard: React.FC<PricingCardProps> = ({
  title,
  price,
  description,
  features,
  buttonText,
  isPopular = false
}) => (
  <Card className={cn("w-[300px] transition-all hover:shadow-lg", isPopular && "border-primary")}>
    <CardHeader>
      <CardTitle>{title}</CardTitle>
      <CardDescription>{description}</CardDescription>
    </CardHeader>
    <CardContent>
      <p className="text-3xl font-bold">${price}<span className="text-sm font-normal">/month</span></p>
      <ul className="mt-4 space-y-2">
        {features.map((feature, index) => (
          <li key={index} className="flex items-center">
            <Check className="mr-2 h-4 w-4 text-primary" /> {feature}
          </li>
        ))}
      </ul>
    </CardContent>
    <CardFooter>
      <Button className={cn("w-full", isPopular ? "bg-primary text-primary-foreground" : "")}>
        {buttonText}
      </Button>
    </CardFooter>
  </Card>
)

export default PricingCard;
