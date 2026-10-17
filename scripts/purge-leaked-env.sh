#!/usr/bin/env bash
#
# purge-leaked-env.sh — Elimina un archivo de credenciales de TODO el historial git.
#
# Incidente (2026-10-17): `apps/web/.env.local` quedó *trackeado* (pese a que
# `.gitignore` lo excluye) y se rellenó con credenciales reales en el `main`
# remoto (commits b433e48, 62343b1, 7acb1e3). Ver informe de investigación.
#
# SEGURIDAD:
#   - Por defecto corre en DRY-RUN: no modifica nada ni toca el remoto.
#   - Ejecuta sobre un clon espejo temporal, NO sobre tu working tree.
#   - Hazlo DESPUÉS de rotar las credenciales. Rotar es lo urgente; purgar
#     la historia no invalida secretos ya copiados.
#
# Uso:
#   scripts/purge-leaked-env.sh                 # dry-run (recomendado primero)
#   scripts/purge-leaked-env.sh --apply         # reescribe el clon espejo
#   scripts/purge-leaked-env.sh --apply --push  # además fuerza el push a origin
#
set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/HackathonFISC/equipo-02.git}"
TARGET_PATH="${TARGET_PATH:-apps/web/.env.local}"     # ruta a purgar (repetible con --path)
WORKDIR="${WORKDIR:-/tmp/opencode/purge-equipo-02}"
MIRROR="${WORKDIR}/equipo-02.git"
BACKUP="${WORKDIR}/backup-$(date +%Y%m%d-%H%M%S).bundle"
SECRET_REGEX='npg_[A-Za-z0-9]{10,}|sk-or-v1-[A-Za-z0-9]+|AIza[0-9A-Za-z_-]{35}|postgresql://[^"]*:[^"@]*@[^"]*neon\.tech'

APPLY=0
PUSH=0
EXTRA_PATHS=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    --apply) APPLY=1 ;;
    --push)  PUSH=1 ;;
    --path)  EXTRA_PATHS+=("$2"); shift ;;
    -h|--help) sed -n '2,25p' "$0"; exit 0 ;;
    *) echo "Opción desconocida: $1" >&2; exit 2 ;;
  esac
  shift
done

log()  { printf '\n\033[1;36m==> %s\033[0m\n' "$*"; }
warn() { printf '\033[1;33m[warn] %s\033[0m\n' "$*" >&2; }
die()  { printf '\033[1;31m[error] %s\033[0m\n' "$*" >&2; exit 1; }

# Escanea los tips de todas las ramas (rápido) + la historia de las rutas objetivo.
tip_scan() {
  local tips
  tips=$(git -C "$MIRROR" for-each-ref --format='%(objectname)' \
    refs/heads refs/tags refs/remotes 2>/dev/null)
  [[ -n "$tips" ]] || return 0
  git -C "$MIRROR" grep -I -E "$SECRET_REGEX" $tips 2>/dev/null | head -3 || true
}
path_scan() {
  git -C "$MIRROR" log --all -p -- "${PATHS[@]}" 2>/dev/null | grep -aE "$SECRET_REGEX" | head -3 || true
}
scan_for_secrets() {
  tip_scan
  path_scan
}

# --- 1. Preflight -----------------------------------------------------------
command -v git >/dev/null || die "git no está instalado"
command -v python3 >/dev/null || die "python3 no está instalado (necesario para git-filter-repo)"

# El fallback descarga un script que luego se ejecuta sobre TODO el historial, así que se fija
# a una versión etiquetada y se verifica su SHA-256 (nunca la rama `main`, que es mutable).
FILTER_REPO_VERSION="v2.47.0"
FILTER_REPO_SHA256="67447413e273fc76809289111748870b6f6072f08b17efe94863a92d810b7d94"

sha256_of() {
  if command -v sha256sum >/dev/null; then sha256sum "$1" | cut -d' ' -f1
  elif command -v shasum >/dev/null; then shasum -a 256 "$1" | cut -d' ' -f1
  else die "no hay sha256sum ni shasum para verificar git-filter-repo"
  fi
}
verify_filter_repo() {
  [[ "$(sha256_of "$1")" == "$FILTER_REPO_SHA256" ]] \
    || die "git-filter-repo ($1) no coincide con el SHA-256 esperado de ${FILTER_REPO_VERSION}; bórralo y reintenta"
}

FILTER_REPO_CMD=()
if command -v git-filter-repo >/dev/null; then
  FILTER_REPO_CMD=(git-filter-repo)
elif [[ -f "${WORKDIR}/git-filter-repo" ]]; then
  verify_filter_repo "${WORKDIR}/git-filter-repo"
  FILTER_REPO_CMD=(python3 "${WORKDIR}/git-filter-repo")
else
  if [[ "$APPLY" -eq 1 ]]; then
    command -v curl >/dev/null || die "curl no está instalado (necesario para descargar git-filter-repo)"
    log "Descargando git-filter-repo ${FILTER_REPO_VERSION} (script Python de un solo archivo)"
    mkdir -p "$WORKDIR"
    curl -fsSL -o "${WORKDIR}/git-filter-repo" \
      "https://raw.githubusercontent.com/newren/git-filter-repo/${FILTER_REPO_VERSION}/git-filter-repo"
    verify_filter_repo "${WORKDIR}/git-filter-repo"
    chmod +x "${WORKDIR}/git-filter-repo"
    FILTER_REPO_CMD=(python3 "${WORKDIR}/git-filter-repo")
  else
    warn "git-filter-repo no encontrado. En --apply se descargará automáticamente."
    FILTER_REPO_CMD=(git-filter-repo)
  fi
fi

PATHS=("$TARGET_PATH" "${EXTRA_PATHS[@]:-}")
# Filtrar elementos vacíos
PATHS=($(printf '%s\n' "${PATHS[@]}" | grep -v '^$' || true))

log "Repositorio : $REPO_URL"
log "Rutas a purgar: ${PATHS[*]}"
log "Modo        : $([[ $APPLY -eq 1 ]] && echo 'APPLY (reescribe)' || echo 'DRY-RUN (no modifica)')"
[[ $PUSH -eq 1 ]] && warn "Push habilitado: se forzará el remoto (¡destructivo!)."

# --- 2. Backup --------------------------------------------------------------
log "Creando clon espejo (backup completo de todas las refs)"
mkdir -p "$WORKDIR"
if [[ ! -d "$MIRROR" ]]; then
  git clone --mirror "$REPO_URL" "$MIRROR"
else
  git -C "$MIRROR" fetch --all --prune || true
fi
git -C "$MIRROR" bundle create "$BACKUP" --all
log "Backup guardado en: $BACKUP  (guárdalo fuera del repo)"

# --- 3. Confirmar que el secreto existe antes de purgar ---------------------
log "Verificando presencia del/los archivo(s) en la historia del espejo"
FOUND=0
for p in "${PATHS[@]}"; do
  LOG_OUT=$(git -C "$MIRROR" log --all --format='    %h %ci %an %s' -- "$p" 2>/dev/null || true)
  if [[ -n "$LOG_OUT" ]]; then
    FOUND=1
    echo "  presente: $p"
    printf '%s\n' "$LOG_OUT" | head -10
  else
    echo "  (no aparece): $p"
  fi
done
[[ "$FOUND" -eq 1 ]] || die "Ninguna ruta existe en la historia. Revisa TARGET_PATH."

# --- 4. Comprobar que hay secretos REALES (solo reporta boolean) ------------
log "Comprobando que hay valores reales (no plantillas)"
SECRET_HITS=$(scan_for_secrets)
if [[ -n "$SECRET_HITS" ]]; then
  echo "  Se detectaron patrones de credenciales reales. Confirmado."
else
  die "No se detectaron patrones fuertes. Revisa la historia manualmente antes de continuar."
fi

# --- 5. Purga ---------------------------------------------------------------
REWRITE_CMD=("${FILTER_REPO_CMD[@]}" --force)
for p in "${PATHS[@]}"; do REWRITE_CMD+=(--path "$p"); done
REWRITE_CMD+=(--invert-paths)

if [[ "$APPLY" -eq 0 ]]; then
  log "DRY-RUN. Se ejecutaría:"
  printf '   (cd %s && %q ' "$MIRROR" "${REWRITE_CMD[0]}"
  printf '%q ' "${REWRITE_CMD[@]:1}"
  printf ')\n'
  log "Nada modificado. Repite con --apply cuando revises el plan."
  exit 0
fi

log "Reescribiendo historia del espejo (eliminando ${PATHS[*]})"
( cd "$MIRROR" && "${REWRITE_CMD[@]}" )

# git-filter-repo elimina el remoto 'origin' por seguridad; lo restauramos.
if ! git -C "$MIRROR" remote get-url origin >/dev/null 2>&1; then
  git -C "$MIRROR" remote add origin "$REPO_URL"
  echo "  (origin re-añadido tras filter-repo)"
fi

# --- 6. Verificación post-purga ---------------------------------------------
log "Verificando que ya no quedan secretos en la historia reescrita"
LEFTOVER=$(scan_for_secrets)
if [[ -n "$LEFTOVER" ]]; then
  die "Todavía se detectan patrones. Revisa los tips/historia de ${PATHS[*]} antes de publicar."
else
  echo "  OK: sin coincidencias de patrones de credenciales."
fi
for p in "${PATHS[@]}"; do
  REMAIN=$(git -C "$MIRROR" log --all --oneline -- "$p" 2>/dev/null || true)
  if [[ -n "$REMAIN" ]]; then
    warn "La ruta sigue en la historia: $p"
  else
    echo "  OK: '$p' eliminado de toda la historia."
  fi
done

# --- 7. Push -----------------------------------------------------------------
if [[ "$PUSH" -eq 0 ]]; then
  log "Purga aplicada SOLO en el espejo local: $MIRROR"
  cat <<EOF

Siguientes pasos MANUALES (revisa antes de ejecutar):

  # 1. Fuerza el push de ramas y tags reescritos:
  git -C "$MIRROR" push --force --all
  git -C "$MIRROR" push --force --tags

  # 2. PR #106: sus refs refs/pull/* son gestionados por GitHub y NO se pueden
  #    sobreescribir. Cierra y reabre el PR (o ábrelo de nuevo desde la rama
  #    reescrita) para regenerar refs/pull/106/merge.

  # 3. GitHub conserva blobs accesibles por SHA hasta su GC. Abre un ticket a
  #    GitHub Support solicitando la purga del commit/objeto filtrado:
  #    https://support.github.com/contact  (tema: "Remove cached sensitive data")

  # 4. Rota las credenciales (si no lo has hecho AÚN): ROTAR PRIMERO.
  #    - OPENROUTER_API_KEY, GOOGLE_MAPS_API_KEY, BETTER_AUTH_SECRET,
  #      CERTO_API_TOKEN y password de Neon (branch production).

  # 5. Endurece: activa Secret Scanning + Push Protection y añade gitleaks al CI.
EOF
  exit 0
fi

log "Haciendo force-push del historial reescrito a origin"
git -C "$MIRROR" push --force --all
git -C "$MIRROR" push --force --tags
warn "Recuerda: cierra/reabre PR #106 y solicita a GitHub Support la purga en caché."
