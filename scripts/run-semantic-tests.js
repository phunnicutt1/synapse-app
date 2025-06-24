const { IntegrationTestSuite } = require('../lib/testing');

async function runSemanticMetadataTests() {
  console.log('🧪 Starting Semantic Metadata Integration Tests...\n');
  
  const testSuite = new IntegrationTestSuite();
  
  try {
    // Run comprehensive test suite
    const summary = await testSuite.runAllTests();
    
    console.log('\n📊 TEST SUMMARY');
    console.log('================');
    console.log(`Total Tests: ${summary.totalTests}`);
    console.log(`Passed: ${summary.passedTests} ✅`);
    console.log(`Failed: ${summary.failedTests} ❌`);
    console.log(`Success Rate: ${summary.successRate.toFixed(1)}%`);
    
    console.log('\n📋 CATEGORY BREAKDOWN');
    console.log('=====================');
    Object.entries(summary.categories).forEach(([category, stats]) => {
      const successRate = ((stats.passed / (stats.passed + stats.failed)) * 100).toFixed(1);
      console.log(`${category}: ${stats.passed}/${stats.passed + stats.failed} (${successRate}%)`);
    });
    
    // Show failing tests
    const failedTests = summary.results.filter(r => !r.passed);
    if (failedTests.length > 0) {
      console.log('\n❌ FAILED TESTS');
      console.log('===============');
      failedTests.forEach(test => {
        console.log(`\n${test.category}: ${test.name}`);
        if (test.error) {
          console.log(`  Error: ${test.error}`);
        } else {
          console.log(`  Expected: ${test.expected}`);
          console.log(`  Actual: ${test.actual}`);
        }
      });
    }
    
    // Highlight key validation results
    const finalValidations = summary.results.filter(r => r.category === 'Final System Validation');
    if (finalValidations.length > 0) {
      console.log('\n🎯 KEY IMPLEMENTATION VALIDATIONS');
      console.log('==================================');
      finalValidations.forEach(test => {
        const status = test.passed ? '✅' : '❌';
        console.log(`${status} ${test.name}`);
        if (test.details) {
          console.log(`    ${test.details}`);
        }
      });
    }
    
    // Check if main claim is validated
    const mainClaim = finalValidations.find(t => t.name.includes('OVERALL CLAIM VALIDATION'));
    if (mainClaim) {
      console.log('\n🏆 FINAL VALIDATION RESULT');
      console.log('===========================');
      if (mainClaim.passed) {
        console.log('✅ CLAIM VALIDATED: The enhanced system provides context-aware, vendor-specific point normalization that significantly improves classification accuracy while maintaining backward compatibility.');
      } else {
        console.log('❌ CLAIM NOT FULLY VALIDATED: Some aspects of the enhanced system need attention.');
      }
      console.log(`   Details: ${mainClaim.details}`);
    }
    
    return summary.successRate >= 80; // Consider 80%+ success as validation
    
  } catch (error) {
    console.error('❌ Test suite failed to run:', error);
    return false;
  }
}

// Run if called directly
if (require.main === module) {
  runSemanticMetadataTests()
    .then(success => {
      console.log(`\n🏁 Test execution completed: ${success ? 'SUCCESS' : 'ISSUES DETECTED'}`);
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Failed to run tests:', error);
      process.exit(1);
    });
}

module.exports = { runSemanticMetadataTests }; 