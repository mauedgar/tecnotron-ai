'use strict';

const fs = require('fs');
const YAML = require('yaml');

const { Task } = require('../contracts/task');

class TaskFileError extends Error {
  constructor(message, code = 'INVALID_TASK_FILE') {
    super(message);
    this.name = 'TaskFileError';
    this.code = code;
  }
}

function parseTaskSource(source) {
  const match = source.match(/^---\s*\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!match) throw new TaskFileError('TASK.md requires YAML frontmatter');

  let metadata;
  try {
    metadata = YAML.parse(match[1]);
  } catch (error) {
    throw new TaskFileError(`TASK.md frontmatter is invalid YAML: ${error.message}`);
  }
  if (metadata?.created_at instanceof Date) metadata.created_at = metadata.created_at.toISOString();

  const parsed = Task.safeParse(metadata);
  if (!parsed.success) {
    const details = parsed.error.issues.map((issue) => `${issue.path.join('.') || 'root'}: ${issue.message}`).join('; ');
    throw new TaskFileError(`TASK.md does not satisfy fitflow-task/v2: ${details}`);
  }
  return parsed.data;
}

function readTaskFile(filePath) {
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    throw new TaskFileError(`TASK.md not found: ${filePath}`, 'TASK_FILE_NOT_FOUND');
  }
  return parseTaskSource(fs.readFileSync(filePath, 'utf8'));
}

module.exports = { TaskFileError, parseTaskSource, readTaskFile };
