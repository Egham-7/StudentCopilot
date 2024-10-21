import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Check, HelpCircle, ChevronDown, ChevronUp } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"

export default function PricingPage() {
  const [isAnnual, setIsAnnual] = useState(false)
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null)

  const pricingPlans = [
    {
      title: "Basic",
      price: 0,
      description: "For individual students",
      features: ["5 lectures per month", "Basic note-taking", "24/7 support", "1 mock exam per module"],
      buttonText: "Get Started",
    },
    {
      title: "Pro",
      price: 10,
      description: "For serious learners",
      features: ["Unlimited lectures", "Advanced note-taking", "Priority support", "Collaboration tools"],
      buttonText: "Upgrade to Pro",
      isPopular: true,
    },
    {
      title: "Enterprise",
      price: 49,
      description: "For institutions",
      features: ["Custom features", "Dedicated account manager", "API access", "Bulk licensing"],
      buttonText: "Contact Sales",
    },
  ];

  const faqs = [
    { q: "Can I change plans later?", a: "Yes, you can upgrade or downgrade your plan at any time. Changes will be reflected in your next billing cycle." },
    { q: "Is there a free trial?", a: "We offer a 14-day free trial for all our plans. No credit card required to start your trial." },
    { q: "What payment methods do you accept?", a: "We accept all major credit cards (Visa, MasterCard, American Express) and PayPal. For Enterprise plans, we also offer invoice-based payments." },
    { q: "How does billing work?", a: "We offer both monthly and annual billing. Choose annual billing to save up to 15%. You can change your billing cycle at any time from your account settings." },
  ]

  return (
    <div className="container mx-auto px-4 py-16">
      <h1 className="text-4xl font-bold text-center mb-4 text-foreground">Choose Your Plan</h1>
      <p className="text-xl text-center text-muted-foreground mb-8">
        Select the perfect plan to suit your learning needs
      </p>

      <div className="flex justify-center items-center mb-12">
        <span className={`mr-2 ${isAnnual ? 'text-muted-foreground' : 'text-foreground font-semibold'}`}>Monthly</span>
        <Switch checked={isAnnual} onCheckedChange={setIsAnnual} />
        <span className={`ml-2 ${isAnnual ? 'text-foreground font-semibold' : 'text-muted-foreground'}`}>Annual (Save 15%)</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
        {pricingPlans.map((plan) => (
          <Card key={plan.title} className={`flex flex-col bg-card text-card-foreground relative ${plan.isPopular ? 'border-primary' : ''}`}>
            {plan.isPopular && (
              <Badge className="absolute top-4 right-4 bg-primary text-primary-foreground">Most Popular</Badge>
            )}
            <CardHeader>
              <CardTitle className="text-foreground">{plan.title}</CardTitle>
              <CardDescription className="text-muted-foreground">{plan.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow">
              <p className="text-4xl font-bold mb-4 text-foreground">
                ${isAnnual ? plan.price * 11 : plan.price}
                <span className="text-xl font-normal text-muted-foreground">
                  /{isAnnual ? 'year' : 'month'}
                </span>
              </p>
              <ul className="space-y-2">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center">
                    <Check className="mr-2 h-4 w-4 text-primary" />
                    <span className="text-foreground">{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              <Button className={`w-full ${plan.isPopular ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'bg-secondary text-secondary-foreground hover:bg-secondary/90'}`}>
                {plan.buttonText}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      <div className="max-w-3xl mx-auto">
        <h2 className="text-2xl font-bold mb-6 text-center text-foreground">Frequently Asked Questions</h2>
        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div key={index} className="bg-muted rounded-lg p-4">
              <button
                className="w-full text-left font-semibold flex items-center justify-between text-foreground"
                onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
              >
                <span className="flex items-center">
                  <HelpCircle className="mr-2 h-5 w-5 text-primary" />
                  {faq.q}
                </span>
                {expandedFaq === index ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
              </button>
              {expandedFaq === index && (
                <p className="mt-2 text-muted-foreground">{faq.a}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

