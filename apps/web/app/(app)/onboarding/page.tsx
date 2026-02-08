"use client";
import { useState } from "react";
import { Button, Card } from "@flowfoundry/ui";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { MessageBanner } from "@/components/MessageBanner";

export default function OnboardingPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    useCase: "",
    teamSize: "",
    industry: "",
    integrations: [] as string[],
    experience: "",
  });
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const saveOnboarding = trpc.onboarding.saveOnboarding.useMutation();
  const completeOnboarding = trpc.onboarding.completeOnboarding.useMutation();

  const useCases = [
    { id: "support", label: "Customer Support Automation", description: "Automate ticket routing and responses" },
    { id: "marketing", label: "Marketing Automation", description: "Lead processing and email campaigns" },
    { id: "sales", label: "Sales Process", description: "CRM updates and follow-ups" },
    { id: "operations", label: "Operations", description: "Data processing and monitoring" },
    { id: "development", label: "Development", description: "CI/CD and deployment automation" },
  ];

  const teamSizes = [
    { id: "1-5", label: "1-5 people" },
    { id: "6-20", label: "6-20 people" },
    { id: "21-50", label: "21-50 people" },
    { id: "50+", label: "50+ people" },
  ];

  const industries = [
    { id: "tech", label: "Technology" },
    { id: "finance", label: "Finance" },
    { id: "healthcare", label: "Healthcare" },
    { id: "education", label: "Education" },
    { id: "retail", label: "Retail" },
    { id: "other", label: "Other" },
  ];

  const integrations = [
    { id: "slack", label: "Slack", icon: "💬" },
    { id: "gmail", label: "Gmail", icon: "📧" },
    { id: "notion", label: "Notion", icon: "📝" },
    { id: "sheets", label: "Google Sheets", icon: "📊" },
    { id: "webhook", label: "Webhooks", icon: "🔗" },
    { id: "http", label: "HTTP APIs", icon: "🌐" },
  ];

  const experiences = [
    { id: "beginner", label: "Beginner", description: "New to workflow automation" },
    { id: "intermediate", label: "Intermediate", description: "Some experience with automation tools" },
    { id: "advanced", label: "Advanced", description: "Expert in workflow automation" },
  ];

  const handleNext = async () => {
    if (currentStep < 5) {
      setCurrentStep(currentStep + 1);
    } else {
      // Complete onboarding
      try {
        await saveOnboarding.mutateAsync({
          useCase: formData.useCase,
          teamSize: formData.teamSize,
          industry: formData.industry,
          integrations: formData.integrations,
          experience: formData.experience
        });
        await completeOnboarding.mutateAsync();
        setMessage({ type: "success", text: "Onboarding completed successfully!" });
        setTimeout(() => {
          router.push("/dashboard");
        }, 1000);
      } catch (error: any) {
        setMessage({ type: "error", text: error.message || "Failed to save onboarding data. Please try again." });
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = async () => {
    try {
      await completeOnboarding.mutateAsync();
      router.push("/dashboard");
    } catch (error: any) {
      setMessage({ type: "error", text: error.message || "Failed to complete onboarding. Please try again." });
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Welcome to FlowFoundry Pro!</h2>
            <p className="text-gray-600 mb-8">
              Let&apos;s set up your account to get you started with the most relevant features.
            </p>
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">What&apos;s your primary use case?</h3>
              <div className="grid grid-cols-1 gap-3">
                {useCases.map((useCase) => (
                  <button
                    key={useCase.id}
                    onClick={() => setFormData({ ...formData, useCase: useCase.id })}
                    className={`p-4 text-left border rounded-lg hover:border-indigo-500 transition-colors ${
                      formData.useCase === useCase.id ? "border-indigo-500 bg-indigo-50" : "border-gray-300"
                    }`}
                  >
                    <div className="font-medium">{useCase.label}</div>
                    <div className="text-sm text-gray-600">{useCase.description}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Team Size</h2>
            <p className="text-gray-600 mb-8">
              This helps us recommend the right plan for your organization.
            </p>
            <div className="grid grid-cols-2 gap-4">
              {teamSizes.map((size) => (
                <button
                  key={size.id}
                  onClick={() => setFormData({ ...formData, teamSize: size.id })}
                  className={`p-4 border rounded-lg hover:border-indigo-500 transition-colors ${
                    formData.teamSize === size.id ? "border-indigo-500 bg-indigo-50" : "border-gray-300"
                  }`}
                >
                  {size.label}
                </button>
              ))}
            </div>
          </div>
        );

      case 3:
        return (
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Industry</h2>
            <p className="text-gray-600 mb-8">
              We&apos;ll customize templates and examples for your industry.
            </p>
            <div className="grid grid-cols-2 gap-4">
              {industries.map((industry) => (
                <button
                  key={industry.id}
                  onClick={() => setFormData({ ...formData, industry: industry.id })}
                  className={`p-4 border rounded-lg hover:border-indigo-500 transition-colors ${
                    formData.industry === industry.id ? "border-indigo-500 bg-indigo-50" : "border-gray-300"
                  }`}
                >
                  {industry.label}
                </button>
              ))}
            </div>
          </div>
        );

      case 4:
        return (
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Integrations</h2>
            <p className="text-gray-600 mb-8">
              Which tools do you use most? We&apos;ll prioritize these in your setup.
            </p>
            <div className="grid grid-cols-2 gap-4">
              {integrations.map((integration) => (
                <button
                  key={integration.id}
                  onClick={() => {
                    const newIntegrations = formData.integrations.includes(integration.id)
                      ? formData.integrations.filter(id => id !== integration.id)
                      : [...formData.integrations, integration.id];
                    setFormData({ ...formData, integrations: newIntegrations });
                  }}
                  className={`p-4 border rounded-lg hover:border-indigo-500 transition-colors ${
                    formData.integrations.includes(integration.id) ? "border-indigo-500 bg-indigo-50" : "border-gray-300"
                  }`}
                >
                  <div className="flex items-center">
                    <span className="text-2xl mr-3">{integration.icon}</span>
                    <span>{integration.label}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        );

      case 5:
        return (
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Experience Level</h2>
            <p className="text-gray-600 mb-8">
              This helps us provide the right level of guidance.
            </p>
            <div className="space-y-4">
              {experiences.map((exp) => (
                <button
                  key={exp.id}
                  onClick={() => setFormData({ ...formData, experience: exp.id })}
                  className={`w-full p-4 text-left border rounded-lg hover:border-indigo-500 transition-colors ${
                    formData.experience === exp.id ? "border-indigo-500 bg-indigo-50" : "border-gray-300"
                  }`}
                >
                  <div className="font-medium">{exp.label}</div>
                  <div className="text-sm text-gray-600">{exp.description}</div>
                </button>
              ))}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl w-full">
        <Card className="p-8">
          {message && (
            <MessageBanner
              type={message.type}
              message={message.text}
              onDismiss={() => setMessage(null)}
            />
          )}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-gray-600">
                Step {currentStep} of 5
              </span>
              <span className="text-sm text-gray-500">
                {Math.round((currentStep / 5) * 100)}% complete
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(currentStep / 5) * 100}%` }}
              />
            </div>
          </div>

          {renderStep()}

          <div className="mt-8 flex justify-between">
            <Button
              variant="secondary"
              onClick={currentStep === 1 ? handleSkip : handleBack}
              disabled={saveOnboarding.isPending || completeOnboarding.isPending}
            >
              {currentStep === 1 ? "Skip setup" : "Back"}
            </Button>
            <Button
              onClick={handleNext}
              disabled={
                (currentStep === 1 && !formData.useCase) ||
                (currentStep === 2 && !formData.teamSize) ||
                (currentStep === 3 && !formData.industry) ||
                (currentStep === 5 && !formData.experience) ||
                saveOnboarding.isPending ||
                completeOnboarding.isPending
              }
            >
              {saveOnboarding.isPending || completeOnboarding.isPending
                ? "Saving..."
                : currentStep === 5
                ? "Complete setup"
                : "Next"}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
