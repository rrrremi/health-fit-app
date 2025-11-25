"use client";

import Link from 'next/link';
import Button from '@/components/ui/Button';

export default function ProtectedHome() {

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-8">Welcome to heal</h1>
      
      <div className="content-card mb-10">
        <h2 className="text-2xl font-bold mb-6">Your Fitness Hub</h2>
        <p className="mb-6">
          Welcome to your personal fitness platform. Generate custom workouts, track your progress, and achieve your fitness goals.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="content-card bg-white/20">
            <h3 className="text-xl font-semibold mb-3">Generate Workout</h3>
            <p className="mb-4">Create a personalized workout plan based on your preferences and goals.</p>
            <Link href="/protected/workouts/generate">
              <Button className="w-full">Create Workout</Button>
            </Link>
          </div>
          
          <div className="content-card bg-white/20">
            <h3 className="text-xl font-semibold mb-3">View Dashboard</h3>
            <p className="mb-4">Check your workout history and track your fitness progress.</p>
            <Link href="/protected/workouts">
              <Button variant="outline" className="w-full">Go to Dashboard</Button>
            </Link>
          </div>
        </div>
      </div>
      
      <div className="content-card">
        <h2 className="text-2xl font-bold mb-4">Quick Links</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <Link href="/protected/profile">
            <Button variant="ghost" className="w-full">Update Profile</Button>
          </Link>
          <Link href="/protected/workouts/history">
            <Button variant="ghost" className="w-full">Workout History</Button>
          </Link>
          <Link href="/protected/settings">
            <Button variant="ghost" className="w-full">Settings</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
