# Monitoring Setup Guide

This application includes comprehensive monitoring and observability features using Sentry for error tracking, performance monitoring, and user feedback collection.

## 🚀 Quick Setup

### 1. Install Dependencies

The monitoring dependencies are already installed:
```bash
npm install @sentry/nextjs @sentry/react @sentry/tracing
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env.local` and configure:

```env
# Sentry Configuration
SENTRY_DSN=https://your-dsn@sentry.io/project-id
NEXT_PUBLIC_SENTRY_DSN=https://your-dsn@sentry.io/project-id
SENTRY_ORG=your-organization-slug
SENTRY_PROJECT=your-project-slug
SENTRY_ENVIRONMENT=development
NEXT_PUBLIC_SENTRY_ENVIRONMENT=development

# Optional: Enable Sentry in development for testing
SENTRY_DEV_MODE=true
```

### 3. Create Sentry Project

1. Go to [sentry.io](https://sentry.io) and create an account
2. Create a new project (choose "Next.js" as the platform)
3. Copy the DSN from the project settings
4. Update your environment variables

### 4. Deploy and Test

After deployment, you can:
- Check the monitoring status in the app
- Submit user feedback
- Monitor errors in your Sentry dashboard
- View performance metrics

## 📊 Features Included

### Error Tracking
- ✅ Automatic React error boundary monitoring
- ✅ Server-side error tracking
- ✅ API error monitoring
- ✅ Custom error contexts and tags

### Performance Monitoring
- ✅ Page load performance
- ✅ API call performance
- ✅ Custom performance measurements
- ✅ Real user monitoring (RUM)

### User Feedback
- ✅ In-app feedback collection
- ✅ User context attachment
- ✅ Categorization and routing

### Session Replay
- ✅ User session recordings
- ✅ Error replay capabilities
- ✅ Privacy-conscious data masking

## 🔧 Configuration Options

### Sampling Rates

Adjust monitoring intensity based on your needs:

```javascript
// In sentry.client.config.js and sentry.server.config.js
tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0, // 10% in prod, 100% in dev
replaysSessionSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 0.1, // 10% session replay
```

### Error Filtering

Customize what errors to track:

```javascript
// Filter out development errors or common non-actionable errors
beforeSend(event, hint) {
  if (process.env.NODE_ENV === 'development' && !process.env.SENTRY_DEV_MODE) {
    return null; // Don't send dev errors unless explicitly enabled
  }

  const error = hint.originalException;
  if (error?.message?.includes('Network request failed')) {
    return null; // Filter network errors
  }

  return event;
}
```

## 📈 Monitoring Dashboard

Access the monitoring status and feedback form:
1. Navigate to any protected page
2. Look for monitoring status in the debug/admin sections
3. Use the feedback form to submit user feedback
4. Test error monitoring with the provided test buttons

## 🔍 What Gets Monitored

### Automatic Monitoring
- React component errors
- Server-side API errors
- Page load performance
- API response times
- JavaScript runtime errors

### Custom Monitoring
- User actions and interactions
- Custom performance measurements
- API call tracking
- User feedback submissions

### Filtered Out (by default)
- Network connectivity errors
- Browser extension errors
- Development console errors
- Authentication failures (unless critical)

## 🛠️ Development Tips

### Testing Monitoring
```javascript
// Test error monitoring
MonitoringService.captureError(new Error('Test error'));

// Test performance monitoring
const endMeasurement = MonitoringService.startMeasurement('test_operation');
// ... do something ...
endMeasurement();

// Test user feedback
MonitoringService.captureFeedback({
  message: 'Test feedback',
  category: 'general'
});
```

### Local Development
- Set `SENTRY_DEV_MODE=true` to enable monitoring in development
- Use the monitoring status component to verify setup
- Check browser console for Sentry initialization messages

## 🚨 Production Considerations

### Security
- Never commit DSN keys to version control
- Use environment-specific DSN keys
- Configure proper CORS policies

### Performance
- Adjust sampling rates based on traffic volume
- Monitor your Sentry usage quotas
- Consider data retention policies

### Privacy
- Session replay data is automatically masked
- User PII is handled according to your privacy policy
- Configure data scrubbing rules as needed

## 📞 Support

If you encounter issues:
1. Check the monitoring status component in your app
2. Verify environment variables are set correctly
3. Check Sentry dashboard for error details
4. Review browser console for initialization errors

## 🔄 Maintenance

### Regular Tasks
- Monitor Sentry usage and costs
- Review and update error filtering rules
- Update sampling rates based on traffic
- Clean up old error patterns

### Upgrades
- Keep Sentry packages updated
- Review breaking changes in major versions
- Test monitoring after deployments

---

**Status**: ✅ **Fully Configured and Ready for Production**

Your application now has enterprise-grade monitoring and observability! 🎉
