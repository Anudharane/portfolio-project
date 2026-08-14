/**
 * assets/js/admin.js
 * Admin Dashboard – JavaScript
 * Handles: sidebar, image preview, SweetAlert deletes, DataTables, form UX
 */

document.addEventListener('DOMContentLoaded', function () {

  // ── Sidebar Toggle (mobile) ───────────────────────────────────────
  const toggleBtn = document.getElementById('sidebarToggle');
  const sidebar   = document.getElementById('sidebar');
  if (toggleBtn && sidebar) {
    toggleBtn.addEventListener('click', function () {
      sidebar.classList.toggle('show');
    });
    // Close sidebar when clicking outside on mobile
    document.addEventListener('click', function (e) {
      if (
        window.innerWidth < 992 &&
        sidebar.classList.contains('show') &&
        !sidebar.contains(e.target) &&
        e.target !== toggleBtn &&
        !toggleBtn.contains(e.target)
      ) {
        sidebar.classList.remove('show');
      }
    });
  }

  // ── Image Preview before upload ───────────────────────────────────
  document.querySelectorAll('.img-preview-input').forEach(function (input) {
    input.addEventListener('change', function () {
      const previewId = input.getAttribute('data-preview');
      const preview   = document.querySelector(previewId);
      if (!preview) return;
      const file = input.files[0];
      if (file) {
        if (!file.type.startsWith('image/')) return;
        const reader = new FileReader();
        reader.onload = function (e) {
          preview.src = e.target.result;
          preview.classList.remove('d-none');
        };
        reader.readAsDataURL(file);
      }
    });
  });

  // ── SweetAlert2 Delete Confirmation ──────────────────────────────
  document.querySelectorAll('.btn-delete').forEach(function (link) {
    link.addEventListener('click', function (e) {
      e.preventDefault();
      const href  = link.getAttribute('href');
      const label = link.getAttribute('data-label') || 'this record';
      Swal.fire({
        title: 'Delete ' + label + '?',
        text: 'This action cannot be undone.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#475569',
        confirmButtonText: '<i class="fa-solid fa-trash me-1"></i> Yes, Delete',
        cancelButtonText: 'Cancel',
        background: '#141428',
        color: '#e2e8f0',
      }).then(function (result) {
        if (result.isConfirmed) {
          window.location.href = href;
        }
      });
    });
  });

  // ── DataTables Initialization ─────────────────────────────────────
  if (window.jQuery && jQuery.fn.DataTable) {
    const tables = document.querySelectorAll('#dataTable');
    tables.forEach(function (table) {
      jQuery(table).DataTable({
        pageLength: 10,
        lengthChange: false,
        language: {
          search: '',
          searchPlaceholder: '🔍 Search...',
          emptyTable: 'No records found.',
          paginate: {
            previous: '<i class="fa-solid fa-chevron-left fa-xs"></i>',
            next: '<i class="fa-solid fa-chevron-right fa-xs"></i>'
          }
        },
        order: [],
        responsive: true,
      });
    });
  }

  // ── Auto-dismiss Bootstrap alerts ────────────────────────────────
  document.querySelectorAll('.alert-dismissible').forEach(function (el) {
    setTimeout(function () {
      el.style.opacity = '0';
      el.style.transition = 'opacity .5s';
      setTimeout(() => el.remove(), 500);
    }, 4000);
  });

  // ── Character counter for textareas ──────────────────────────────
  document.querySelectorAll('textarea[maxlength]').forEach(function (ta) {
    const max   = parseInt(ta.getAttribute('maxlength'), 10);
    const label = document.createElement('small');
    label.className = 'text-muted d-block text-end mt-1';
    label.textContent = ta.value.length + ' / ' + max;
    ta.parentNode.insertBefore(label, ta.nextSibling);
    ta.addEventListener('input', function () {
      label.textContent = ta.value.length + ' / ' + max;
    });
  });

  // ── Tooltip initialization ────────────────────────────────────────
  const tooltipEls = document.querySelectorAll('[data-bs-toggle="tooltip"]');
  tooltipEls.forEach(function (el) {
    new bootstrap.Tooltip(el);
  });

  // ── Range input live display ──────────────────────────────────────
  document.querySelectorAll('input[type="range"]').forEach(function (range) {
    const display = document.getElementById(range.getAttribute('data-display'));
    if (display) {
      display.textContent = range.value + '%';
      range.addEventListener('input', function () {
        display.textContent = range.value + '%';
      });
    }
  });

});
