import { execSync } from 'child_process';

export default async function globalSetup() {
  execSync('../../src/backend/reset_db.sh');
}