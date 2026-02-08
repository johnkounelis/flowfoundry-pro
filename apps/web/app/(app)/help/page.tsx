"use client";
import { useState } from "react";
import { Card, Button, Badge } from "@flowfoundry/ui";

export default function HelpPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const categories = [
    { id: "all", name: "All Topics", count: 24 },
    { id: "getting-started", name: "Getting Started", count: 6 },
    { id: "flows", name: "Flows & Automation", count: 8 },
    { id: "connectors", name: "Connectors", count: 5 },
    { id: "billing", name: "Billing & Plans", count: 3 },
    { id: "troubleshooting", name: "Troubleshooting", count: 2 },
  ];

  const articles = [
    {
      id: 1,
      title: "Getting Started with FlowFoundry Pro",
      category: "getting-started",
      description: "Learn the basics of creating your first workflow automation",
      readTime: "5 min read",
      difficulty: "beginner",
    },
    {
      id: 2,
      title: "Creating Your First Flow",
      category: "flows",
      description: "Step-by-step guide to building a simple automation flow",
      readTime: "8 min read",
      difficulty: "beginner",
    },
    {
      id: 3,
      title: "Setting up Slack Integration",
      category: "connectors",
      description: "Connect your Slack workspace and configure notifications",
      readTime: "6 min read",
      difficulty: "intermediate",
    },
    {
      id: 4,
      title: "AI Steps and Token Usage",
      category: "flows",
      description: "Understanding AI processing and managing token costs",
      readTime: "10 min read",
      difficulty: "intermediate",
    },
    {
      id: 5,
      title: "Gmail Connector Setup",
      category: "connectors",
      description: "Configure Gmail integration for email automation",
      readTime: "7 min read",
      difficulty: "intermediate",
    },
    {
      id: 6,
      title: "Troubleshooting Failed Runs",
      category: "troubleshooting",
      description: "Common issues and solutions for failed workflow runs",
      readTime: "12 min read",
      difficulty: "advanced",
    },
    {
      id: 7,
      title: "Understanding Billing and Usage",
      category: "billing",
      description: "How pricing works and monitoring your usage",
      readTime: "6 min read",
      difficulty: "beginner",
    },
    {
      id: 8,
      title: "Advanced Flow Patterns",
      category: "flows",
      description: "Complex workflow patterns and best practices",
      readTime: "15 min read",
      difficulty: "advanced",
    },
  ];

  const faqs = [
    {
      question: "How do I create my first flow?",
      answer: "Start by going to the Flows page and clicking 'Create Flow'. Choose a template or start from scratch, then add nodes to build your workflow.",
    },
    {
      question: "What connectors are available?",
      answer: "We support Slack, Gmail, HTTP APIs, Webhooks, Notion, and Google Sheets. More connectors are added regularly.",
    },
    {
      question: "How does AI processing work?",
      answer: "AI steps can classify, summarize, extract, or translate content. Each AI operation consumes tokens based on input and output size.",
    },
    {
      question: "Can I test flows before publishing?",
      answer: "Yes! Use the 'Test Flow' button in the flow builder to run a test execution with sample data.",
    },
    {
      question: "How do I monitor flow performance?",
      answer: "Check the Dashboard for real-time metrics, or go to the Runs page to see detailed execution logs.",
    },
    {
      question: "What happens if a flow fails?",
      answer: "Failed runs are logged with error details. You can retry failed runs or fix the underlying issue and run again.",
    },
  ];

  const filteredArticles = articles.filter(article => {
    const matchesCategory = selectedCategory === "all" || article.category === selectedCategory;
    const matchesSearch = article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         article.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "beginner": return "green";
      case "intermediate": return "blue";
      case "advanced": return "red";
      default: return "gray";
    }
  };

  return (
    <div className="py-10">
      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-2">Help Center</h2>
        <p className="text-gray-600">
          Find answers, guides, and support for FlowFoundry Pro.
        </p>
      </div>

      {/* Search */}
      <Card className="mb-8">
        <div className="p-6">
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search help articles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <Button variant="secondary">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Search
            </Button>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Categories */}
        <div className="lg:col-span-1">
          <Card>
            <div className="p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Categories</h3>
              <div className="space-y-2">
                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                      selectedCategory === category.id
                        ? "bg-indigo-100 text-indigo-700"
                        : "hover:bg-gray-100"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{category.name}</span>
                      <span className="text-sm text-gray-500">{category.count}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </Card>
        </div>

        {/* Articles */}
        <div className="lg:col-span-2">
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-2">Help Articles</h3>
            <p className="text-gray-600">
              {filteredArticles.length} article{filteredArticles.length !== 1 ? 's' : ''} found
            </p>
          </div>

          <div className="space-y-4">
            {filteredArticles.map((article) => (
              <Card key={article.id} className="hover:shadow-md transition-shadow">
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold text-lg mb-2">{article.title}</h4>
                      <p className="text-gray-600 mb-3">{article.description}</p>
                      <div className="flex items-center space-x-4">
                        <span className="text-sm text-gray-500">{article.readTime}</span>
                        <Badge color={getDifficultyColor(article.difficulty)}>
                          {article.difficulty}
                        </Badge>
                      </div>
                    </div>
                    <Button variant="secondary" size="sm">
                      Read
                    </Button>
                  </div>
                </div>
              </Card>
            ))}

            {filteredArticles.length === 0 && (
              <Card>
                <div className="p-8 text-center">
                  <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <h3 className="text-lg font-semibold mb-2">No articles found</h3>
                  <p className="text-gray-600 mb-4">
                    Try adjusting your search terms or browse different categories.
                  </p>
                  <Button variant="secondary" onClick={() => {
                    setSearchQuery("");
                    setSelectedCategory("all");
                  }}>
                    Clear filters
                  </Button>
                </div>
              </Card>
            )}
          </div>
        </div>

        {/* FAQ */}
        <div className="lg:col-span-1">
          <Card>
            <div className="p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Quick FAQ</h3>
              <div className="space-y-4">
                {faqs.map((faq, index) => (
                  <div key={index}>
                    <h4 className="font-medium text-sm text-gray-900 mb-1">
                      {faq.question}
                    </h4>
                    <p className="text-xs text-gray-600">
                      {faq.answer}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          <Card className="mt-6">
            <div className="p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Need More Help?</h3>
              <div className="space-y-3">
                <Button 
                  variant="secondary" 
                  className="w-full"
                  onClick={() => window.open('mailto:support@flowfoundry.com?subject=Help Request', '_blank')}
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  Contact Support
                </Button>
                <Button 
                  variant="secondary" 
                  className="w-full"
                  onClick={() => window.open('https://community.flowfoundry.com', '_blank')}
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                  </svg>
                  Community Forum
                </Button>
                <Button 
                  variant="secondary" 
                  className="w-full"
                  onClick={() => window.open('/docs', '_blank')}
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.747 5.754 19 7.5 19s3.332-.253 4.5-1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.747 18.246 19 16.5 19c-1.746 0-3.332-.253-4.5-1.253" />
                  </svg>
                  Documentation
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
