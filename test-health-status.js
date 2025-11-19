// Test health status calculation
const fetch = require('node-fetch');

async function testHealthStatus() {
  try {
    console.log('Testing health status API...\n');
    
    const response = await fetch('http://localhost:3009/api/measurements/summary');
    const data = await response.json();
    
    console.log('API Response:', JSON.stringify(data, null, 2));
    
    if (!data.metrics) {
      console.error('No metrics in response!');
      return;
    }
    
    console.log(`\nTotal metrics: ${data.metrics.length}\n`);
    
    // Check health status for each metric
    data.metrics.forEach(metric => {
      console.log(`Metric: ${metric.display_name}`);
      console.log(`  Value: ${metric.latest_value} ${metric.unit}`);
      console.log(`  Healthy Range: ${metric.healthy_min_male} - ${metric.healthy_max_male}`);
      console.log(`  Validation Range: ${metric.min_value} - ${metric.max_value}`);
      console.log(`  Health Status: ${metric.health_status || 'NULL'}`);
      console.log('');
    });
    
    // Count status types
    const statusCounts = data.metrics.reduce((acc, m) => {
      const status = m.health_status || 'null';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});
    
    console.log('Status Distribution:');
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`  ${status}: ${count}`);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testHealthStatus();
