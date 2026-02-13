console.log('=== Test Electron ===');
console.log('process.type:', process.type);
console.log('process.versions.electron:', process.versions.electron);

// Try different ways to require electron
try {
  const electron1 = require('electron');
  console.log('require("electron") type:', typeof electron1);
  console.log('is string?:', typeof electron1 === 'string');
  if (typeof electron1 === 'string') {
    console.log('electron path:', electron1);
  } else {
    console.log('electron keys:', Object.keys(electron1).slice(0, 10));
  }
} catch (err) {
  console.error('Error requiring electron:', err.message);
}

// Check if we're in Electron
if (process.versions && process.versions.electron) {
  console.log('\n✓ Running inside Electron');

  // In Electron, the require should work differently
  // Let's check the require cache
  const electronModule = require.cache[require.resolve('electron')];
  console.log('Module in cache:', !!electronModule);
  if (electronModule) {
    console.log('Module exports type:', typeof electronModule.exports);
  }
} else {
  console.log('\n✗ NOT running inside Electron');
}
