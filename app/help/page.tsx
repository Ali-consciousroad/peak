"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  MessageCircle, 
  Bot, 
  HelpCircle, 
  Users, 
  FileText, 
  DollarSign,
  Settings,
  BookOpen,
  Mail,
  Phone,
  Globe
} from "lucide-react";

const helpCategories = [
  {
    title: "Getting Started",
    icon: <HelpCircle className="h-6 w-6" />,
    description: "Learn the basics of using the platform",
    topics: [
      "How to create an account",
      "Understanding user roles",
      "Completing your profile",
      "Platform navigation"
    ]
  },
  {
    title: "Missions & Projects",
    icon: <FileText className="h-6 w-6" />,
    description: "Everything about creating and managing missions",
    topics: [
      "Creating a new mission",
      "Writing effective descriptions",
      "Setting budgets and timelines",
      "Managing offers"
    ]
  },
  {
    title: "Offers & Hiring",
    icon: <Users className="h-6 w-6" />,
    description: "How clients send offers and hire builders",
    topics: [
      "Sending an offer to a builder",
      "Reviewing received offers",
      "Accepting or rejecting an offer",
      "Selecting the right builder"
    ]
  },
  {
    title: "Payments & Contracts",
    icon: <DollarSign className="h-6 w-6" />,
    description: "Understanding payments and legal agreements",
    topics: [
      "Payment methods",
      "Platform fees",
      "Contract creation",
      "Dispute resolution"
    ]
  },
  {
    title: "Communication",
    icon: <MessageCircle className="h-6 w-6" />,
    description: "How to communicate with other users",
    topics: [
      "Using the messaging system",
      "Starting conversations",
      "File sharing",
      "Real-time chat features"
    ]
  },
  {
    title: "Account Settings",
    icon: <Settings className="h-6 w-6" />,
    description: "Managing your account and preferences",
    topics: [
      "Profile settings",
      "Privacy options",
      "Notification preferences",
      "Account security"
    ]
  }
];

const quickActions = [
  {
    title: "Ask AI Assistant",
    description: "Get instant help from our AI chatbot",
    icon: <Bot className="h-8 w-8" />,
    action: () => {
      const chatbotButton = document.querySelector('[data-chatbot-trigger]') as HTMLButtonElement;
      if (chatbotButton) {
        chatbotButton.click();
      }
    },
    color: "bg-blue-500 hover:bg-blue-600"
  },
  {
    title: "Browse Documentation",
    description: "Read detailed guides and tutorials",
    icon: <BookOpen className="h-8 w-8" />,
    action: () => window.open("/docs", "_blank"),
    color: "bg-green-500 hover:bg-green-600"
  },
  {
    title: "Contact Support",
    description: "Get help from our support team",
    icon: <Mail className="h-8 w-8" />,
    action: () => window.open("mailto:support@freelancemarketplace.com"),
    color: "bg-purple-500 hover:bg-purple-600"
  },
  {
    title: "Community Forum",
    description: "Connect with other users",
    icon: <Globe className="h-8 w-8" />,
    action: () => window.open("/community", "_blank"),
    color: "bg-orange-500 hover:bg-orange-600"
  }
];

export default function HelpPage() {
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);

  return (
    <div className="flex-1 w-full">
      <div className="container mx-auto px-4 py-8 pt-24">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Help & Support Center
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Get help with using the platform, find answers to common questions, and connect with our support team.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {quickActions.map((action, index) => (
            <Card 
              key={index} 
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={action.action}
            >
              <CardContent className="p-6 text-center">
                <div className={`inline-flex p-3 rounded-full text-white mb-4 ${action.color}`}>
                  {action.icon}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  {action.title}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {action.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* AI Assistant Highlight */}
        <Card className="mb-12 bg-gradient-to-r from-blue-500 to-purple-600 text-white">
          <CardContent className="p-8">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h2 className="text-2xl font-bold mb-2">🤖 AI Assistant Available 24/7</h2>
                <p className="text-blue-100 mb-4">
                  Get instant answers to your questions with our AI-powered chatbot. 
                  Ask about missions, payments, profiles, and more!
                </p>
                <Button 
                  onClick={() => {
                    const chatbotButton = document.querySelector('[data-chatbot-trigger]') as HTMLButtonElement;
                    if (chatbotButton) {
                      chatbotButton.click();
                    }
                  }}
                  className="bg-white text-blue-600 hover:bg-gray-100"
                >
                  <Bot className="h-4 w-4 mr-2" />
                  Start Chatting Now
                </Button>
              </div>
              <div className="hidden md:block">
                <Bot className="h-24 w-24 text-blue-200" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Help Categories */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {helpCategories.map((category, index) => (
            <Card 
              key={index}
              className={`cursor-pointer transition-all hover:shadow-lg ${
                selectedCategory === index ? 'ring-2 ring-blue-500' : ''
              }`}
              onClick={() => setSelectedCategory(selectedCategory === index ? null : index)}
            >
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <div className="text-blue-500">
                    {category.icon}
                  </div>
                  <CardTitle className="text-lg">{category.title}</CardTitle>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {category.description}
                </p>
              </CardHeader>
              {selectedCategory === index && (
                <CardContent className="pt-0">
                  <ul className="space-y-2">
                    {category.topics.map((topic, topicIndex) => (
                      <li key={topicIndex} className="flex items-center text-sm">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                        {topic}
                      </li>
                    ))}
                  </ul>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-4 w-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      const chatbotButton = document.querySelector('[data-chatbot-trigger]') as HTMLButtonElement;
                      if (chatbotButton) {
                        chatbotButton.click();
                      }
                    }}
                  >
                    <Bot className="h-4 w-4 mr-2" />
                    Ask AI About This
                  </Button>
                </CardContent>
              )}
            </Card>
          ))}
        </div>

        {/* Contact Information */}
        <div className="mt-12 text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Still Need Help?
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Our support team is here to help you succeed.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-8">
            <div className="flex items-center space-x-2">
              <Mail className="h-5 w-5 text-blue-500" />
              <span className="text-gray-700 dark:text-gray-300">support@freelancemarketplace.com</span>
            </div>
            <div className="flex items-center space-x-2">
              <Phone className="h-5 w-5 text-blue-500" />
              <span className="text-gray-700 dark:text-gray-300">+1 (555) 123-4567</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
