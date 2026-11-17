#!/usr/bin/env node
/**
 * Jalankan backend lalu frontend.
 *
 * Latar belakang: `npm run dev` dulu hanya menyalakan frontend, sehingga halaman
 * admin gagal dengan 503 "Layanan data belum dapat dihubungi" saat backend belum
 * hidup. Skrip ini menyalakan API lebih dulu, menunggu sampai siap, baru web.
 *
 * Catatan:
 * - Frontend dipaksa PORT=3000 supaya Next tidak "menggeser" ke 3001 (port API).
 * - Kalau salah satu proses berhenti, proses lain dibiarkan hidup supaya mudah
 *   didiagnosis; Ctrl+C mematikan keduanya.
 * - Tanpa dependency tambahan.
 */
import { execSync, spawn } from 'node:child_process';

const children = [];
let webStarted = false;

function start(command, label, extraEnv = {}) {
  const child = spawn(command, {
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: true,
    env: { ...process.env, ...extraEnv },
  });
  child.stdout.on('data', (chunk) => process.stdout.write(`[${label}] ${chunk}`));
  child.stderr.on('data', (chunk) => process.stderr.write(`[${label}] ${chunk}`));
  child.on('exit', (code) => {
    console.error(
      `[${label}] berhenti (kode ${code}). Proses lain dibiarkan hidup; tekan Ctrl+C untuk menghentikan semuanya.`,
    );
  });
  children.push({ child, label });
  return child;
}

function startWeb() {
  if (webStarted) return;
  webStarted = true;
  start('npm run dev:frontend', 'web', { PORT: '3000' });
}

function killTree(child) {
  if (!child || child.exitCode !== null) return;
  if (process.platform === 'win32') {
    try {
      execSync(`taskkill /PID ${child.pid} /T /F`, { stdio: 'ignore' });
    } catch {
      // proses sudah mati
    }
    return;
  }
  child.kill('SIGTERM');
}

function shutdown() {
  for (const entry of children) killTree(entry.child);
  process.exitCode = 0;
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

const api = start('npm run dev:backend', 'api');

// Nyalakan web setelah API benar-benar siap; kalau tidak terdeteksi, tetap jalan
// setelah 15 detik supaya kegagalan API terlihat di log, bukan menggantung.
api.stdout.on('data', (chunk) => {
  if (/berjalan di/i.test(String(chunk))) startWeb();
});
setTimeout(startWeb, 15000);
