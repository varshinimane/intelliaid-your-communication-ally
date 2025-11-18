import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { Brain, MessageSquare, BarChart3, Globe, Mic, Smile } from "lucide-react";

const Index = () => {
  const features = [
    {
      icon: <Mic className="h-6 w-6" />,
      title: "Speech-to-Text & Text-to-Speech",
      description: "Convert thoughts seamlessly between speech and text",
    },
    {
      icon: <MessageSquare className="h-6 w-6" />,
      title: "Visual Communication Cards",
      description: "Express ideas with intuitive visual symbol cards",
    },
    {
      icon: <Smile className="h-6 w-6" />,
      title: "Emotion Recognition",
      description: "AI detects and responds to emotional states",
    },
    {
      icon: <Globe className="h-6 w-6" />,
      title: "Multilingual Support",
      description: "Real-time translation across languages",
    },
    {
      icon: <Brain className="h-6 w-6" />,
      title: "AI Content Simplification",
      description: "Complex topics made easy to understand",
    },
    {
      icon: <BarChart3 className="h-6 w-6" />,
      title: "Progress Analytics",
      description: "Track emotional trends and engagement",
    },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="container px-4 py-20 md:py-32">
        <div className="mx-auto max-w-4xl text-center space-y-8 animate-fade-in">
          <div className="inline-flex items-center rounded-full bg-accent/10 px-4 py-2 text-sm text-accent">
            <Brain className="mr-2 h-4 w-4" />
            AI-Powered Communication Assistant
          </div>

          <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
            Empowering
            <span className="text-primary"> Neurodiverse</span> Learners
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            IntelliAid bridges communication gaps with emotion-aware AI, visual tools, 
            and multilingual support—making learning more inclusive and intuitive.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Button size="lg" asChild className="rounded-full text-lg h-12 px-8">
              <Link to="/student">
                <MessageSquare className="mr-2 h-5 w-5" />
                Start Learning
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="rounded-full text-lg h-12 px-8">
              <Link to="/dashboard">
                <BarChart3 className="mr-2 h-5 w-5" />
                Teacher Dashboard
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="container px-4 py-20 bg-muted/30">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
            Built for Inclusivity
          </h2>
          <p className="text-muted-foreground text-center mb-12 max-w-2xl mx-auto">
            Every feature designed to support diverse learning needs and communication styles
          </p>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <Card
                key={index}
                className="p-6 hover:shadow-lg transition-all duration-300 hover:scale-105"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="flex items-start space-x-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    {feature.icon}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold mb-2">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container px-4 py-20">
        <Card className="mx-auto max-w-4xl p-8 md:p-12 text-center bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Transform Learning?
          </h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join educators and students who are already experiencing the power of 
            emotion-aware, AI-assisted communication.
          </p>
          <Button size="lg" asChild className="rounded-full text-lg h-12 px-8">
            <Link to="/login">Get Started Free</Link>
          </Button>
        </Card>
      </section>
    </div>
  );
};

export default Index;
