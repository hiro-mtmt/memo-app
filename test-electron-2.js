console.log('=== Alternative Electron API Access ===');

// Check what's available in process
console.log('process.type:', process.type);
console.log('process._linkedBinding:', typeof process._linkedBinding);
console.log('process.atomBinding:', typeof process.atomBinding);
console.log('process.electronBinding:', typeof process.electronBinding);

// Try to access Electron through internal bindings
if (typeof process.electronBinding === 'function') {
  try {
    const app = process.electronBinding('app');
    console.log('Got app through electronBinding:', typeof app);
  } catch (err) {
    console.error('electronBinding failed:', err.message);
  }
}

if (typeof process._linkedBinding === 'function') {
  try {
    const v8_util = process._linkedBinding('electron_common_v8_util');
    console.log('Got v8_util:', typeof v8_util);
  } catch (err) {
    console.error('_linkedBinding failed:', err.message);
  }
}

// Check global
console.log('\nGlobal properties:', Object.keys(global).filter(k => k.toLowerCase().includes('electron')));
