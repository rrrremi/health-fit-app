# Counter App Deployment Guide

This document outlines the steps required to deploy the Counter App to a production environment.

## Prerequisites

- Node.js 18+ and npm
- Supabase account
- Vercel account (recommended for Next.js deployment)

## Environment Setup

1. Create a new Supabase project
2. Set up the database schema using the SQL in `supabase/schema.sql`
3. Configure the following environment variables:

```
NEXT_PUBLIC_SUPABASE_URL=your_production_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_production_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_production_supabase_service_role_key
NEXT_PUBLIC_APP_URL=your_production_app_url
```

## Deployment Steps

### Option 1: Vercel (Recommended)

1. Push your code to a Git repository (GitHub, GitLab, Bitbucket)
2. Connect your repository to Vercel
3. Configure the environment variables in the Vercel dashboard
4. Deploy the application

### Option 2: Manual Deployment

1. Build the application:
   ```bash
   npm run build
   ```

2. Start the production server:
   ```bash
   npm start
   ```

## Post-Deployment Checklist

1. Verify all authentication flows work
2. Check that the counter functionality works correctly
3. Ensure admin panel is accessible only to admin users
4. Test responsive design on various devices
5. Monitor for any errors in the console or server logs

## Database Maintenance

- Regularly backup your Supabase database
- Monitor database usage and scale as needed
- Review RLS policies periodically to ensure security

## Monitoring and Analytics

- Set up error tracking (e.g., Sentry)
- Configure analytics to track user engagement
- Monitor server performance and response times

## Troubleshooting

### Common Issues

1. **Authentication Issues**
   - Check Supabase configuration
   - Verify environment variables are correctly set

2. **Database Connection Issues**
   - Check network connectivity
   - Verify RLS policies are not blocking legitimate requests

3. **Deployment Failures**
   - Check build logs for errors
   - Verify Node.js version compatibility
