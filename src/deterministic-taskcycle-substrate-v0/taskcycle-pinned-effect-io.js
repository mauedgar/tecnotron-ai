'use strict';

// Linux-only, descriptor-anchored output for forked Phase1 effect evidence.
// /proc/self/fd/<n>/child resolves through the OPEN directory inode, not the
// original mutable pathname. Non-Linux hosts fail closed for forked effects.
// This assumes the operator's effective UID is trusted; a hostile process with
// the same UID (or root) is outside the filesystem trust boundary.
const fs = require('node:fs');
const path = require('node:path');
const flags = fs.constants.O_RDONLY | fs.constants.O_DIRECTORY | fs.constants.O_NOFOLLOW;
const fileFlags = fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW;
const expectedFiles = ['manifest.json', 'projection.json'];
const proc = (fd, name = '') => '/proc/self/fd/' + fd + (name ? '/' + name : '');
function sameObject(a, b) { return a.dev === b.dev && a.ino === b.ino; }
function unsafe(reason, effect_state = 'NONE') {
  return { kind: 'BLOCKED', reason, effect_state };
}
function safeComponent(v) {
  return typeof v === 'string' && /^[A-Za-z0-9_.-]+$/.test(v) && v !== '.' && v !== '..';
}
function openDirectory(target) {
  const fd = fs.openSync(target, flags);
  if (!fs.fstatSync(fd).isDirectory()) {
    fs.closeSync(fd);
    throw Error('NOT_A_DIRECTORY');
  }
  return fd;
}
function absoluteRoot(root) {
  let fd = null;
  try {
    if (process.platform !== 'linux' || typeof process.getuid !== 'function'
        || !fs.existsSync('/proc/self/fd')) throw Error('ANCHORED_IO_UNSUPPORTED');
    const absolute = path.resolve(root);
    if (!path.isAbsolute(absolute) || absolute.indexOf('\0') >= 0) throw Error('UNSAFE_ROOT');
    fd = openDirectory(path.parse(absolute).root);
    for (const component of absolute.slice(path.parse(absolute).root.length).split(path.sep).filter(Boolean)) {
      if (!safeComponent(component)) throw Error('UNSAFE_ROOT_COMPONENT');
      const child = openDirectory(proc(fd, component));
      fs.closeSync(fd);
      fd = child;
    }
    const stat = fs.fstatSync(fd);
    // Other UIDs may read, but must never be able to replace the operator's root.
    if (stat.uid !== process.getuid() || (stat.mode & 0o022) !== 0) throw Error('ROOT_NOT_PRIVATE');
    const visible = fs.lstatSync(absolute);
    if (!visible.isDirectory() || visible.isSymbolicLink() || !sameObject(visible, stat))
      throw Error('ROOT_IDENTITY_DRIFT');
    const pinned = fd;
    fd = null;
    return pinned;
  } finally {
    if (fd !== null) fs.closeSync(fd);
  }
}
function openChild(parentFd, childName) {
  const entry = proc(parentFd, childName);
  let before;
  try { before = fs.lstatSync(entry); }
  catch (e) { if (e.code === 'ENOENT') return null; throw e; }
  if (!before.isDirectory() || before.isSymbolicLink()) throw Error('UNSAFE_CHILD_DIRECTORY');
  const fd = openDirectory(entry);
  try {
    if (!sameObject(before, fs.fstatSync(fd))) throw Error('CHILD_DIRECTORY_RACED');
    return fd;
  } catch (e) { fs.closeSync(fd); throw e; }
}
function childExists(parentFd, name) {
  const fd = openChild(parentFd, name);
  if (fd === null) return false;
  fs.closeSync(fd);
  return true;
}
function sameEntry(parentFd, childName, fd) {
  try {
    const visible = fs.lstatSync(proc(parentFd, childName));
    return visible.isDirectory() && !visible.isSymbolicLink()
      && sameObject(visible, fs.fstatSync(fd));
  } catch { return false; }
}
function readRegular(parentFd, filename) {
  const fd = fs.openSync(proc(parentFd, filename), fileFlags);
  try {
    const before = fs.fstatSync(fd);
    if (!before.isFile() || before.nlink !== 1) throw Error('UNSAFE_EFFECT_FILE');
    const bytes = fs.readFileSync(fd, 'utf8');
    const after = fs.fstatSync(fd);
    if (!sameObject(before, after) || before.size !== after.size || before.mtimeMs !== after.mtimeMs)
      throw Error('CHANGED_EFFECT_FILE');
    return bytes;
  } finally { fs.closeSync(fd); }
}
function inspect(fd, pkg) {
  try {
    const entries = fs.readdirSync(proc(fd)).sort();
    if (entries.length !== expectedFiles.length ||
        entries.some((x, i) => x !== expectedFiles[i])) return 'UNKNOWN';
    const manifest = readRegular(fd, 'manifest.json');
    const projection = readRegular(fd, 'projection.json');
    return manifest === pkg.manifestText && projection === pkg.projectionText
      ? 'EXACT' : 'CONFLICT';
  } catch { return 'UNKNOWN'; }
}
function stableRoot(root, rootFd) {
  try {
    const visible = fs.lstatSync(root);
    return visible.isDirectory() && !visible.isSymbolicLink()
      && sameObject(visible, fs.fstatSync(rootFd));
  } catch { return false; }
}
function secureParent(rootFd, parentName) {
  const fd = openChild(rootFd, parentName);
  if (fd === null) return null;
  const stat = fs.fstatSync(fd);
  if (stat.uid !== process.getuid() || (stat.mode & 0o022) !== 0) {
    fs.closeSync(fd);
    throw Error('PARENT_NOT_PRIVATE');
  }
  return fd;
}
// This helper ONLY materializes isolated Phase1 evidence. A PASS from the
// qualifyFirstWrite callback proves a read-only Git SOURCE check, not Product
// approval, Phase2 or lifecycle closure.
function reconcilePinnedEffect({ root, taskName, obligationName, pkg, qualifyFirstWrite }) {
  if (!safeComponent(taskName) || !safeComponent(obligationName) ||
      !pkg || typeof pkg.manifestText !== 'string' || typeof pkg.projectionText !== 'string'
      || typeof qualifyFirstWrite !== 'function') return unsafe('ANCHORED_IO_REQUEST_INVALID');
  if (process.platform !== 'linux') return unsafe('ANCHORED_IO_UNSUPPORTED_PLATFORM');
  let rootFd = null, parentFd = null, finalFd = null, staging = null;
  let attemptedPublication = false;
  const parentPath = () => proc(rootFd, taskName);
  const finalPath = () => proc(parentFd, obligationName);
  try {
    rootFd = absoluteRoot(root);
    parentFd = secureParent(rootFd, taskName);
    if (parentFd !== null) {
      finalFd = openChild(parentFd, obligationName);
      if (finalFd !== null) {
        const result = inspect(finalFd, pkg);
        const stable = sameEntry(rootFd, taskName, parentFd)
          && sameEntry(parentFd, obligationName, finalFd) && stableRoot(root, rootFd);
        if (!stable) return unsafe('ANCHORED_EXISTING_EFFECT_RACE', 'UNKNOWN');
        if (result === 'EXACT') return { kind: 'EXACT' };
        return result === 'CONFLICT' ? unsafe('TASKCYCLE_EFFECT_RECONCILIATION_IDENTITY_CONFLICT')
          : unsafe('EFFECT_RECONCILIATION_PROJECTION_AMBIGUOUS', 'UNKNOWN');
      }
    }
    const qualified = qualifyFirstWrite();
    if (qualified.status !== 'PASS') return unsafe(qualified.reason || 'FORK_GIT_EVIDENCE_UNAVAILABLE');
    if (!stableRoot(root, rootFd)) return unsafe('ANCHORED_ROOT_CHANGED', 'UNKNOWN');
    if (parentFd === null) {
      try { fs.mkdirSync(parentPath(), { mode: 0o700 }); }
      catch (e) { if (e.code !== 'EEXIST') throw e; }
      parentFd = secureParent(rootFd, taskName);
      if (parentFd === null) throw Error('PARENT_MISSING_AFTER_CREATE');
    }
    if (!sameEntry(rootFd, taskName, parentFd)) return unsafe('ANCHORED_PARENT_CHANGED', 'UNKNOWN');
    if (childExists(parentFd, obligationName)) return unsafe('ANCHORED_FINAL_CHANGED', 'UNKNOWN');
    staging = fs.mkdtempSync(proc(parentFd, '.' + obligationName + '.staging-'));
    const stageFd = openChild(parentFd, path.basename(staging));
    if (stageFd === null) throw Error('STAGING_NOT_FOUND');
    try {
      fs.writeFileSync(proc(stageFd, 'projection.json'), pkg.projectionText, { flag: 'wx', mode: 0o600 });
      fs.writeFileSync(proc(stageFd, 'manifest.json'), pkg.manifestText, { flag: 'wx', mode: 0o600 });
      if (inspect(stageFd, pkg) !== 'EXACT') throw Error('STAGING_IDENTITY_FAILED');
      if (!sameEntry(rootFd, taskName, parentFd) ||
          !sameEntry(parentFd, path.basename(staging), stageFd) || !stableRoot(root, rootFd))
        return unsafe('ANCHORED_STAGING_CHANGED', 'UNKNOWN');
      // An attacker with another UID cannot mutate the private parent directory.
      // The rename operates on pinned directory objects regardless of path swaps.
      if (childExists(parentFd, obligationName)) return unsafe('ANCHORED_FINAL_CHANGED', 'UNKNOWN');
      attemptedPublication = true;
      fs.renameSync(proc(parentFd, path.basename(staging)), finalPath());
      staging = null;
    } finally { fs.closeSync(stageFd); }
    finalFd = openChild(parentFd, obligationName);
    if (finalFd === null || inspect(finalFd, pkg) !== 'EXACT' ||
        !sameEntry(parentFd, obligationName, finalFd) ||
        !sameEntry(rootFd, taskName, parentFd) || !stableRoot(root, rootFd))
      return unsafe('ANCHORED_PUBLISH_NOT_PROVEN', 'UNKNOWN');
    return { kind: 'CREATED' };
  } catch (error) {
    return unsafe('ANCHORED_IO_' + (error?.message || error?.code || 'UNKNOWN'),
      attemptedPublication ? 'UNKNOWN' : 'NONE');
  } finally {
    if (staging !== null && parentFd !== null) {
      try { fs.rmSync(proc(parentFd, path.basename(staging)), { recursive: true, force: true }); }
      catch { /* staging cleanup is best effort; a later attempt must reconcile */ }
    }
    if (finalFd !== null) fs.closeSync(finalFd);
    if (parentFd !== null) fs.closeSync(parentFd);
    if (rootFd !== null) fs.closeSync(rootFd);
  }
}
module.exports = { reconcilePinnedEffect };
