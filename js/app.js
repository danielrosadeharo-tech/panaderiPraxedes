// =============================================
// PANADERÍA PRÁXEDES — Aplicación Principal
// =============================================

(() => {
  'use strict';

  // ---- Helpers ----
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  function showToast(msg, type = 'info') {
    const container = $('#toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = msg;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3500);
  }

  function openModal(id) {
    $(`#${id}`).classList.remove('hidden');
  }

  function closeModal(id) {
    $(`#${id}`).classList.add('hidden');
  }

  function formatDate(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  function badgeClass(tipo) {
    const map = { 'Viña': 'badge-vina', 'Pesadora': 'badge-pesadora' };
    return map[tipo] || 'badge-otros';
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(text));
    return div.innerHTML;
  }

  // ---- Navigation ----
  const navLinks = $$('.nav-link');
  const sections = $$('.section');
  const titles = {
    dashboard:     'Panel de Control',
    maquinas:      'Gestión de Máquinas',
    documentacion: 'Documentación',
    inventario:    'Inventario de Recambios',
    historial:     'Historial de Sustituciones',
  };

  function navigateTo(sectionName) {
    navLinks.forEach(l => l.classList.toggle('active', l.dataset.section === sectionName));
    sections.forEach(s => {
      s.classList.toggle('active', s.id === `section-${sectionName}`);
    });
    $('#page-title').textContent = titles[sectionName] || '';
    // Close sidebar on mobile
    $('#sidebar').classList.remove('open');
  }

  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      navigateTo(link.dataset.section);
    });
  });

  $('#menu-toggle').addEventListener('click', () => {
    $('#sidebar').classList.toggle('open');
  });

  // Close modals
  $$('[data-close]').forEach(btn => {
    btn.addEventListener('click', () => closeModal(btn.dataset.close));
  });

  // ---- Auth (Required) ----
  let currentUser = null;
  let dataLoaded = false;

  function showApp() {
    $('#login-screen').classList.add('hidden');
    $('#app-container').classList.remove('hidden');
    if (!dataLoaded) {
      dataLoaded = true;
      loadMaquinas();
      loadDocs();
      loadRecambios();
      loadHistorial();
    }
  }

  function showLogin() {
    $('#login-screen').classList.remove('hidden');
    $('#app-container').classList.add('hidden');
  }

  auth.onAuthStateChanged((user) => {
    currentUser = user;
    if (user) {
      showApp();
      $('#user-area').innerHTML = `
        <span style="font-size:.85rem;color:var(--color-texto-light)">${escapeHtml(user.email)}</span>
        <button id="btn-logout" class="btn btn-sm">Salir</button>
      `;
      $('#btn-logout').addEventListener('click', () => auth.signOut());
    } else {
      showLogin();
      $('#user-area').innerHTML = '';
    }
  });

  $('#form-login').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = $('#login-email').value.trim();
    const password = $('#login-password').value;
    const remember = $('#login-remember').checked;
    const errEl = $('#login-error');
    const infoEl = $('#login-info');
    errEl.classList.add('hidden');
    infoEl.classList.add('hidden');

    const persistence = remember
      ? firebase.auth.Auth.Persistence.LOCAL
      : firebase.auth.Auth.Persistence.SESSION;

    try {
      await auth.setPersistence(persistence);
      await auth.signInWithEmailAndPassword(email, password);
    } catch (err) {
      errEl.textContent = 'Email o contraseña incorrectos';
      errEl.classList.remove('hidden');
    }
  });

  $('#btn-forgot').addEventListener('click', async (e) => {
    e.preventDefault();
    const email = $('#login-email').value.trim();
    const errEl = $('#login-error');
    const infoEl = $('#login-info');
    errEl.classList.add('hidden');
    infoEl.classList.add('hidden');

    if (!email) {
      errEl.textContent = 'Escribe tu email primero';
      errEl.classList.remove('hidden');
      return;
    }
    try {
      await auth.sendPasswordResetEmail(email);
      infoEl.textContent = 'Se ha enviado un email para restablecer tu contraseña';
      infoEl.classList.remove('hidden');
    } catch (err) {
      errEl.textContent = 'No se pudo enviar el email. Verifica la dirección.';
      errEl.classList.remove('hidden');
    }
  });

  // ---- Populate Machine Selects ----
  function populateMachineSelects(maquinas) {
    const selects = ['#doc-maquina', '#recambio-maquina', '#cambio-maquina', '#filtro-maquina-inv'];
    selects.forEach(sel => {
      const el = $(sel);
      const firstOpt = el.querySelector('option');
      el.innerHTML = '';
      el.appendChild(firstOpt);
      maquinas.forEach(m => {
        const opt = document.createElement('option');
        opt.value = m.id;
        opt.textContent = m.nombre;
        el.appendChild(opt);
      });
    });
  }

  // =============================================
  // MÁQUINAS
  // =============================================
  let maquinasCache = [];

  function renderMaquinas(maquinas) {
    maquinasCache = maquinas;
    populateMachineSelects(maquinas);
    const container = $('#lista-maquinas');
    if (!maquinas.length) {
      container.innerHTML = '<p class="empty-msg">No hay máquinas registradas.</p>';
      return;
    }
    container.innerHTML = maquinas.map(m => `
      <div class="card card-clickable" onclick="app.verMaquina('${m.id}')">
        <div class="card-header">
          <h3>${escapeHtml(m.nombre)}</h3>
        </div>
        <div class="card-actions">
          <button class="btn btn-sm" onclick="event.stopPropagation(); app.editMaquina('${m.id}')">✏️ Editar</button>
          <button class="btn btn-sm btn-danger" onclick="event.stopPropagation(); app.deleteMaquina('${m.id}')">🗑️ Eliminar</button>
        </div>
      </div>
    `).join('');
  }

  function loadMaquinas() {
    db.collection('maquinas').onSnapshot((snap) => {
      console.log('onSnapshot maquinas:', snap.size, 'documentos');
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      console.log('Datos maquinas:', data);
      renderMaquinas(data);
      $('#stat-maquinas').textContent = data.length;
    }, (err) => {
      console.error('Error cargando máquinas:', err);
      showToast('Error cargando máquinas', 'error');
    });
  }

  $('#btn-add-maquina').addEventListener('click', () => {
    $('#form-maquina').reset();
    $('#maquina-id').value = '';
    $('#modal-maquina-title').textContent = 'Nueva Máquina';
    openModal('modal-maquina');
  });

  $('#form-maquina').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = $('#maquina-id').value;
    const data = {
      nombre: $('#maquina-nombre').value.trim(),
    };
    try {
      if (id) {
        await db.collection('maquinas').doc(id).update(data);
        showToast('Máquina actualizada', 'success');
      } else {
        const docRef = await db.collection('maquinas').add(data);
        console.log('Máquina guardada con ID:', docRef.id);
        showToast('Máquina registrada', 'success');
      }
      closeModal('modal-maquina');
    } catch (err) {
      console.error('Error al guardar máquina:', err);
      showToast('Error al guardar: ' + err.message, 'error');
    }
  });

  window.app = window.app || {};

  window.app.editMaquina = async (id) => {
    const doc = await db.collection('maquinas').doc(id).get();
    if (!doc.exists) return;
    const m = doc.data();
    $('#maquina-id').value = id;
    $('#maquina-nombre').value = m.nombre;
    $('#modal-maquina-title').textContent = 'Editar Máquina';
    openModal('modal-maquina');
  };

  window.app.deleteMaquina = async (id) => {
    if (!confirm('¿Eliminar esta máquina?')) return;
    try {
      await db.collection('maquinas').doc(id).delete();
      showToast('Máquina eliminada', 'success');
    } catch (err) {
      console.error('Error al eliminar máquina:', err);
      showToast('Error al eliminar: ' + err.message, 'error');
    }
  };

  // =============================================
  // DOCUMENTACIÓN
  // =============================================
  function renderDocs(docs) {
    const container = $('#lista-docs');
    if (!docs.length) {
      container.innerHTML = '<p class="empty-msg">No hay documentos subidos.</p>';
      return;
    }
    container.innerHTML = docs.map(d => {
      const maquina = maquinasCache.find(m => m.id === d.idMaqui);
      const maquiNombre = maquina ? maquina.nombre : 'Desconocida';
      return `
        <div class="card">
          <div class="card-header">
            <h3>${escapeHtml(d.nombreDoc)}</h3>
          </div>
          <p class="card-meta">Máquina: ${escapeHtml(maquiNombre)}</p>
          <p class="card-meta">Subido: ${formatDate(d.fechaSubida)}</p>
          <div class="card-actions">
            <a href="${escapeHtml(d.urlArchivo)}" target="_blank" rel="noopener noreferrer" class="btn btn-sm btn-primary">📥 Descargar</a>
            <button class="btn btn-sm btn-danger" onclick="app.deleteDoc('${d.id}')">🗑️ Eliminar</button>
          </div>
        </div>`;
    }).join('');
  }

  let docsCache = [];
  function loadDocs() {
    db.collection('documentacion').orderBy('fechaSubida', 'desc').onSnapshot((snap) => {
      docsCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      renderDocs(docsCache);
      $('#stat-docs').textContent = docsCache.length;
      refreshDetalleIfOpen();
    }, (err) => { console.error('Error cargando documentos:', err); showToast('Error cargando documentos', 'error'); });
  }

  $('#btn-add-doc').addEventListener('click', () => {
    $('#form-doc').reset();
    openModal('modal-doc');
  });

  $('#form-doc').addEventListener('submit', async (e) => {
    e.preventDefault();
    const idMaqui   = $('#doc-maquina').value;
    const nombreDoc = $('#doc-nombre').value.trim();
    const urlArchivo = $('#doc-url').value.trim();

    try {
      await db.collection('documentacion').add({
        idMaqui,
        nombreDoc,
        urlArchivo,
        fechaSubida: new Date().toISOString().split('T')[0],
      });
      closeModal('modal-doc');
      showToast('Documento añadido correctamente', 'success');
    } catch (err) {
      console.error('Error al guardar documento:', err);
      showToast('Error al guardar: ' + err.message, 'error');
    }
  });

  window.app.deleteDoc = async (id) => {
    if (!confirm('¿Eliminar este documento?')) return;
    try {
      await db.collection('documentacion').doc(id).delete();
      showToast('Documento eliminado', 'success');
    } catch (err) {
      console.error('Error al eliminar documento:', err);
      showToast('Error al eliminar: ' + err.message, 'error');
    }
  };

  // =============================================
  // INVENTARIO RECAMBIOS
  // =============================================
  function renderRecambios(recambios, filtro) {
    const filtered = filtro ? recambios.filter(r => r.idMaqui === filtro) : recambios;
    const container = $('#lista-recambios');
    if (!filtered.length) {
      container.innerHTML = '<p class="empty-msg">No hay recambios registrados.</p>';
      return;
    }
    container.innerHTML = `
      <table>
        <thead>
          <tr>
            <th>Pieza</th>
            <th>Máquina</th>
            <th>Stock</th>
            <th>Proveedor</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          ${filtered.map(r => {
            const maquina = maquinasCache.find(m => m.id === r.idMaqui);
            const maquiNombre = maquina ? maquina.nombre : '—';
            return `
              <tr>
                <td><strong>${escapeHtml(r.pieza)}</strong></td>
                <td>${escapeHtml(maquiNombre)}</td>
                <td>
                  <div class="stock-controls">
                    <button class="btn-icon" onclick="app.updateStock('${r.id}', -1)" title="Restar">➖</button>
                    <span class="stock-value">${r.stock}</span>
                    <button class="btn-icon" onclick="app.updateStock('${r.id}', 1)" title="Sumar">➕</button>
                  </div>
                </td>
                <td>${escapeHtml(r.proveedor || '—')}</td>
                <td>
                  <button class="btn btn-sm" onclick="app.editRecambio('${r.id}')">✏️</button>
                  <button class="btn btn-sm btn-danger" onclick="app.deleteRecambio('${r.id}')">🗑️</button>
                </td>
              </tr>`;
          }).join('')}
        </tbody>
      </table>`;
  }

  let recambiosCache = [];
  function loadRecambios() {
    db.collection('inventario_recambios').orderBy('pieza').onSnapshot((snap) => {
      recambiosCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      renderRecambios(recambiosCache, $('#filtro-maquina-inv').value);
      $('#stat-recambios').textContent = recambiosCache.length;
      refreshDetalleIfOpen();
    }, (err) => { console.error('Error cargando recambios:', err); showToast('Error cargando recambios', 'error'); });
  }

  $('#filtro-maquina-inv').addEventListener('change', () => {
    renderRecambios(recambiosCache, $('#filtro-maquina-inv').value);
  });

  $('#btn-add-recambio').addEventListener('click', () => {
    $('#form-recambio').reset();
    $('#recambio-id').value = '';
    openModal('modal-recambio');
  });

  $('#form-recambio').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = $('#recambio-id').value;
    const data = {
      idMaqui:   $('#recambio-maquina').value,
      pieza:     $('#recambio-pieza').value.trim(),
      stock:     parseInt($('#recambio-stock').value, 10) || 0,
      proveedor: $('#recambio-proveedor').value.trim(),
    };
    try {
      if (id) {
        await db.collection('inventario_recambios').doc(id).update(data);
        showToast('Recambio actualizado', 'success');
      } else {
        await db.collection('inventario_recambios').add(data);
        showToast('Recambio añadido', 'success');
      }
      closeModal('modal-recambio');
    } catch (err) {
      console.error('Error al guardar recambio:', err);
      showToast('Error al guardar: ' + err.message, 'error');
    }
  });

  window.app.updateStock = async (id, delta) => {
    try {
      const ref = db.collection('inventario_recambios').doc(id);
      const doc = await ref.get();
      if (!doc.exists) return;
      const newStock = Math.max(0, (doc.data().stock || 0) + delta);
      await ref.update({ stock: newStock });
    } catch (err) {
      console.error('Error actualizando stock:', err);
      showToast('Error stock: ' + err.message, 'error');
    }
  };

  window.app.editRecambio = async (id) => {
    const doc = await db.collection('inventario_recambios').doc(id).get();
    if (!doc.exists) return;
    const r = doc.data();
    $('#recambio-id').value = id;
    $('#recambio-maquina').value = r.idMaqui;
    $('#recambio-pieza').value = r.pieza;
    $('#recambio-stock').value = r.stock;
    $('#recambio-proveedor').value = r.proveedor || '';
    openModal('modal-recambio');
  };

  window.app.deleteRecambio = async (id) => {
    if (!confirm('¿Eliminar este recambio?')) return;
    try {
      await db.collection('inventario_recambios').doc(id).delete();
      showToast('Recambio eliminado', 'success');
    } catch (err) {
      console.error('Error al eliminar recambio:', err);
      showToast('Error al eliminar: ' + err.message, 'error');
    }
  };

  // =============================================
  // HISTORIAL DE SUSTITUCIONES
  // =============================================
  function getEstado(c) {
    if (!c.fechaCambio || !c.diasRecordatorio) return { texto: '—', clase: '' };
    const fechaCambio = new Date(c.fechaCambio + 'T00:00:00');
    const diasPasados = Math.floor((Date.now() - fechaCambio.getTime()) / 86400000);
    const diasRestantes = c.diasRecordatorio - diasPasados;
    if (diasRestantes <= 0) {
      return { texto: 'Necesita cambio', clase: 'badge-warning' };
    }
    return { texto: `Cambiado (${diasRestantes}d)`, clase: 'badge-ok' };
  }

  function renderHistorial(cambios) {
    const container = $('#lista-historial');
    if (!cambios.length) {
      container.innerHTML = '<p class="empty-msg">No hay registros de sustituciones.</p>';
      return;
    }
    container.innerHTML = `
      <table>
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Máquina</th>
            <th>Componente</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          ${cambios.map(c => {
            const maquina = maquinasCache.find(m => m.id === c.idMaqui);
            const maquiNombre = maquina ? maquina.nombre : '—';
            const estado = getEstado(c);
            return `
              <tr>
                <td>${formatDate(c.fechaCambio)}</td>
                <td>${escapeHtml(maquiNombre)}</td>
                <td>${escapeHtml(c.componente)}</td>
                <td><span class="card-badge ${estado.clase}">${estado.texto}</span></td>
                <td><button class="btn btn-sm btn-danger" onclick="app.deleteCambio('${c.id}')">🗑️</button></td>
              </tr>`;
          }).join('')}
        </tbody>
      </table>`;
  }

  let historialCache = [];
  function loadHistorial() {
    db.collection('historial_cambios').orderBy('fechaCambio', 'desc').onSnapshot((snap) => {
      historialCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      renderHistorial(historialCache);
      $('#stat-cambios').textContent = historialCache.length;
      renderUltimosCambios(historialCache.slice(0, 5));
      refreshDetalleIfOpen();
    }, (err) => { console.error('Error cargando historial:', err); showToast('Error cargando historial', 'error'); });
  }

  function renderUltimosCambios(cambios) {
    const container = $('#ultimos-cambios');
    if (!cambios.length) {
      container.innerHTML = '<p class="empty-msg">No hay registros aún.</p>';
      return;
    }
    container.innerHTML = `
      <table>
        <thead><tr><th>Fecha</th><th>Componente</th><th>Estado</th></tr></thead>
        <tbody>
          ${cambios.map(c => {
            const estado = getEstado(c);
            return `
            <tr>
              <td>${formatDate(c.fechaCambio)}</td>
              <td>${escapeHtml(c.componente)}</td>
              <td><span class="card-badge ${estado.clase}">${estado.texto}</span></td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>`;
  }

  // ---- cambio-maquina is populated from maquinasCache via populateMachineSelects ----

  $('#btn-add-cambio').addEventListener('click', () => {
    $('#form-cambio').reset();
    openModal('modal-cambio');
  });

  $('#form-cambio').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = {
      idMaqui:          $('#cambio-maquina').value,
      componente:       $('#cambio-componente').value.trim(),
      fechaCambio:      $('#cambio-fecha').value,
      diasRecordatorio: parseInt($('#cambio-dias').value, 10) || 0,
    };
    try {
      await db.collection('historial_cambios').add(data);
      closeModal('modal-cambio');
      showToast('Sustitución registrada', 'success');
    } catch (err) {
      console.error('Error al registrar cambio:', err);
      showToast('Error al registrar: ' + err.message, 'error');
    }
  });

  window.app.deleteCambio = async (id) => {
    if (!confirm('¿Eliminar este registro?')) return;
    try {
      await db.collection('historial_cambios').doc(id).delete();
      showToast('Registro eliminado', 'success');
    } catch (err) {
      console.error('Error al eliminar registro:', err);
      showToast('Error al eliminar: ' + err.message, 'error');
    }
  };

  // =============================================
  // DETALLE DE MÁQUINA
  // =============================================
  let currentMaquinaId = null;

  // Tabs
  $$('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      $$('.tab').forEach(t => t.classList.remove('active'));
      $$('.tab-content').forEach(tc => tc.classList.remove('active'));
      tab.classList.add('active');
      $(`#${tab.dataset.tab}`).classList.add('active');
    });
  });

  window.app.verMaquina = (id) => {
    currentMaquinaId = id;
    const maquina = maquinasCache.find(m => m.id === id);
    if (!maquina) return;

    $('#detalle-maquina-nombre').textContent = maquina.nombre;
    $('#page-title').textContent = maquina.nombre;

    // Show detail section, hide others
    sections.forEach(s => s.classList.remove('active'));
    $('#section-maquina-detalle').classList.add('active');
    navLinks.forEach(l => l.classList.remove('active'));

    // Reset to first tab
    $$('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === 'tab-docs'));
    $$('.tab-content').forEach(tc => tc.classList.toggle('active', tc.id === 'tab-docs'));

    renderDetalleDocs(id);
    renderDetalleRecambios(id);
    renderDetalleHistorial(id);
  };

  function renderDetalleDocs(maquinaId) {
    const filtered = docsCache.filter(d => d.idMaqui === maquinaId);
    const container = $('#detalle-docs');
    if (!filtered.length) {
      container.innerHTML = '<p class="empty-msg">No hay documentos para esta máquina.</p>';
      return;
    }
    container.innerHTML = filtered.map(d => `
      <div class="card">
        <div class="card-header"><h3>${escapeHtml(d.nombreDoc)}</h3></div>
        <p class="card-meta">Subido: ${formatDate(d.fechaSubida)}</p>
        <div class="card-actions">
          <a href="${escapeHtml(d.urlArchivo)}" target="_blank" rel="noopener noreferrer" class="btn btn-sm btn-primary">📥 Abrir</a>
          <button class="btn btn-sm btn-danger" onclick="app.deleteDoc('${d.id}')">🗑️</button>
        </div>
      </div>`).join('');
  }

  function renderDetalleRecambios(maquinaId) {
    const filtered = recambiosCache.filter(r => r.idMaqui === maquinaId);
    const container = $('#detalle-recambios');
    if (!filtered.length) {
      container.innerHTML = '<p class="empty-msg">No hay recambios para esta máquina.</p>';
      return;
    }
    container.innerHTML = `
      <table>
        <thead><tr><th>Pieza</th><th>Stock</th><th>Proveedor</th><th>Acciones</th></tr></thead>
        <tbody>
          ${filtered.map(r => `
            <tr>
              <td><strong>${escapeHtml(r.pieza)}</strong></td>
              <td>
                <div class="stock-controls">
                  <button class="btn-icon" onclick="app.updateStock('${r.id}', -1)">➖</button>
                  <span class="stock-value">${r.stock}</span>
                  <button class="btn-icon" onclick="app.updateStock('${r.id}', 1)">➕</button>
                </div>
              </td>
              <td>${escapeHtml(r.proveedor || '—')}</td>
              <td>
                <button class="btn btn-sm" onclick="app.editRecambio('${r.id}')">✏️</button>
                <button class="btn btn-sm btn-danger" onclick="app.deleteRecambio('${r.id}')">🗑️</button>
              </td>
            </tr>`).join('')}
        </tbody>
      </table>`;
  }

  function renderDetalleHistorial(maquinaId) {
    const filtered = historialCache.filter(c => c.idMaqui === maquinaId);
    const container = $('#detalle-historial');
    if (!filtered.length) {
      container.innerHTML = '<p class="empty-msg">No hay sustituciones para esta máquina.</p>';
      return;
    }
    container.innerHTML = `
      <table>
        <thead><tr><th>Fecha</th><th>Componente</th><th>Estado</th><th>Acciones</th></tr></thead>
        <tbody>
          ${filtered.map(c => {
            const estado = getEstado(c);
            return `
            <tr>
              <td>${formatDate(c.fechaCambio)}</td>
              <td>${escapeHtml(c.componente)}</td>
              <td><span class="card-badge ${estado.clase}">${estado.texto}</span></td>
              <td><button class="btn btn-sm btn-danger" onclick="app.deleteCambio('${c.id}')">🗑️</button></td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>`;
  }

  // Back button
  $('#btn-volver-maquinas').addEventListener('click', () => {
    currentMaquinaId = null;
    navigateTo('maquinas');
  });

  // Add buttons from detail view
  $('#btn-add-doc-detalle').addEventListener('click', () => {
    $('#form-doc').reset();
    $('#doc-maquina').value = currentMaquinaId;
    openModal('modal-doc');
  });
  $('#btn-add-recambio-detalle').addEventListener('click', () => {
    $('#form-recambio').reset();
    $('#recambio-id').value = '';
    $('#recambio-maquina').value = currentMaquinaId;
    openModal('modal-recambio');
  });
  $('#btn-add-cambio-detalle').addEventListener('click', () => {
    $('#form-cambio').reset();
    $('#cambio-maquina').value = currentMaquinaId;
    openModal('modal-cambio');
  });

  // Refresh detail view when data changes
  function refreshDetalleIfOpen() {
    if (currentMaquinaId && $('#section-maquina-detalle').classList.contains('active')) {
      renderDetalleDocs(currentMaquinaId);
      renderDetalleRecambios(currentMaquinaId);
      renderDetalleHistorial(currentMaquinaId);
    }
  }

  // ---- Init ----
  // Data loading is triggered by auth.onAuthStateChanged when user logs in
})();
