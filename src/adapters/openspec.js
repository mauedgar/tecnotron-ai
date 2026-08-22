'use strict';

class OpenSpecAdapterError extends Error {
  constructor(message) {
    super(message);
    this.name = 'OpenSpecAdapterError';
  }
}

/** Solo expone consultas; el cliente no recibe operaciones de mutacion. */
class OpenSpecAdapter {
  constructor(client) {
    if (!client || typeof client.listChanges !== 'function' || typeof client.readChange !== 'function') {
      throw new OpenSpecAdapterError('cliente OpenSpec de lectura es requerido');
    }
    this.client = Object.freeze({ listChanges: client.listChanges.bind(client), readChange: client.readChange.bind(client) });
  }

  async listRelevant(query = {}) {
    const changes = await this.client.listChanges();
    const terms = [query.changeId, query.taskId, query.text].filter(Boolean).map((value) => String(value).toLowerCase());
    const relevant = !terms.length ? changes : changes.filter((change) => {
      const searchable = `${change.id || ''} ${change.title || ''} ${change.summary || ''}`.toLowerCase();
      return terms.some((term) => searchable.includes(term));
    });
    return { status: 'PASS', changes: relevant.map((change) => ({ id: change.id, title: change.title, status: change.status || null })) };
  }

  async read(changeId) {
    if (!changeId) throw new OpenSpecAdapterError('changeId es requerido');
    const change = await this.client.readChange(changeId);
    return { status: 'PASS', change: { id: change.id, title: change.title, status: change.status || null, delta: change.delta || null } };
  }
}

module.exports = { OpenSpecAdapter, OpenSpecAdapterError };
