#!/usr/bin/env node

// Create .env.production from Railway's environment variables
// Railway injects env vars at build time, but Next.js needs them in .env file

const fs = require('fs');
const path = require('path');

const envVars = [
  'NEXT_PUBLIC_BASE_RPC_URL',
  'NEXT_PUBLIC_MEGA_RPC_URL',
  'NEXT_PUBLIC_BASE_CHAIN_ID',
  'NEXT_PUBLIC_MEGA_CHAIN_ID',
  'NEXT_PUBLIC_BAD_BUNNZ_BASE',
  'NEXT_PUBLIC_BAD_BUNNZ_MEGA',
  'NEXT_PUBLIC_ETH_BRIDGE',
  'NEXT_PUBLIC_MEGA_BRIDGE',
  'NEXT_PUBLIC_API_BASE_URL',
  'NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID',
];

const envContent = envVars
  .map((varName) => {
    const value = process.env[varName];
    if (value) {
      return `${varName}=${value}`;
    }
    return null;
  })
  .filter((line) => line !== null)
  .join('\n');

const envPath = path.join(process.cwd(), '.env.production');
fs.writeFileSync(envPath, envContent + '\n', 'utf8');

console.log('=== Railway Env Var Check ===');
envVars.forEach((varName) => {
  const value = process.env[varName];
  console.log(`${varName}: ${value ? 'SET (' + value.substring(0, 20) + '...)' : 'NOT SET'}`);
});

console.log('\nCreated .env.production with Railway environment variables');
if (envContent) {
  console.log('Variables set:', envVars.filter((v) => process.env[v]).join(', '));
  console.log('\n.env.production content:');
  console.log(envContent);
} else {
  console.log('Warning: No NEXT_PUBLIC_* variables found in environment');
}
