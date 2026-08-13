#!/usr/bin/env bash

set -Eeuo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="${PROJECT_DIR}/backend"
BACKEND_ENV="${BACKEND_DIR}/.env"
BACKEND_PORT="${BACKEND_PORT:-8000}"=

NGROK_API="http://127.0.0.1:4040/api/tunnels"
NGROK_LOG="$(mktemp /tmp/freelas-ngrok.XXXXXX.log)"
REDIS_LOG="$(mktemp /tmp/freelas-redis.XXXXXX.log)"
NGROK_PID=""
REDIS_PID=""
BACKEND_PID=""
FRONTEND_PID=""

cleanup() {
    local exit_code=$?
    trap - EXIT INT TERM

    for pid in "${FRONTEND_PID}" "${BACKEND_PID}" "${NGROK_PID}" "${REDIS_PID}"; do
        if [[ -n "${pid}" ]] && kill -0 "${pid}" 2>/dev/null; then
            kill "${pid}" 2>/dev/null || true
        fi
    done

    rm -f "${NGROK_LOG}" "${REDIS_LOG}"
    exit "${exit_code}"
}

set_env_value() {
    local key="$1"
    local value="$2"
    local env_file="$3"
    local temp_file

    touch "${env_file}"
    temp_file="$(mktemp "${env_file}.tmp.XXXXXX")"

    awk -v key="${key}" -v value="${value}" '
        BEGIN { updated = 0 }
        index($0, key "=") == 1 {
            print key "=" value
            updated = 1
            next
        }
        { print }
        END {
            if (!updated) {
                print key "=" value
            }
        }
    ' "${env_file}" > "${temp_file}"

    mv "${temp_file}" "${env_file}"
}

read_env_value() {
    local key="$1"
    local env_file="$2"

    awk -v key="${key}" '
        index($0, key "=") == 1 {
            sub("^[^=]*=", "")
            print
            exit
        }
    ' "${env_file}"
}

trap cleanup EXIT INT TERM

if ! command -v ngrok >/dev/null 2>&1; then
    echo "ngrok não foi encontrado."
    echo "Instale-o uma vez seguindo https://ngrok.com/download/linux"
    exit 1
fi

if [[ ! -x "${BACKEND_DIR}/venv/bin/python" ]]; then
    echo "O ambiente virtual não foi encontrado em backend/venv."
    exit 1
fi

# Redis — usado para armazenar as mensagens do chat
if redis-cli ping >/dev/null 2>&1; then
    echo "Redis já está rodando em redis://127.0.0.1:6379."
else
    if command -v redis-server >/dev/null 2>&1; then
        echo "Iniciando o Redis (porta 6379) para o chat..."
        redis-server --port 6379 --bind 127.0.0.1 --save "" --appendonly no --logfile "${REDIS_LOG}" &
        REDIS_PID=$!
        for _ in {1..20}; do
            if redis-cli ping >/dev/null 2>&1; then
                break
            fi
            sleep 0.5
        done
        if ! redis-cli ping >/dev/null 2>&1; then
            echo "Não foi possível iniciar o Redis na porta 6379."
            exit 1
        fi
        echo "Redis rodando em redis://127.0.0.1:6379 (log: ${REDIS_LOG})"
    else
        echo "ATENÇÃO: redis-server não encontrado. O chat não funcionará sem o Redis."
    fi
fi

NGROK_AUTHTOKEN="$(read_env_value "NGROK_AUTHTOKEN" "${BACKEND_ENV}")"
if [[ -z "${NGROK_AUTHTOKEN}" ]]; then
    echo "Preencha NGROK_AUTHTOKEN no arquivo backend/.env."
    echo "O token está disponível em https://dashboard.ngrok.com/get-started/your-authtoken"
    exit 1
fi
export NGROK_AUTHTOKEN

echo "Iniciando o túnel HTTPS do ngrok..."
ngrok http "${BACKEND_PORT}" --log=stdout > "${NGROK_LOG}" 2>&1 &
NGROK_PID=$!

PUBLIC_URL=""
for _ in {1..40}; do
    if ! kill -0 "${NGROK_PID}" 2>/dev/null; then
        echo "O ngrok encerrou antes de criar o túnel:"
        tail -20 "${NGROK_LOG}"
        exit 1
    fi

    PUBLIC_URL="$(
        curl -fsS "${NGROK_API}" 2>/dev/null |
        python3 -c '
import json
import sys

try:
    tunnels = json.load(sys.stdin).get("tunnels", [])
    print(next(
        tunnel["public_url"]
        for tunnel in tunnels
        if tunnel.get("proto") == "https"
    ))
except (StopIteration, KeyError, TypeError, ValueError):
    pass
' || true
    )"

    if [[ "${PUBLIC_URL}" == https://* ]]; then
        break
    fi

    sleep 0.5
done

if [[ "${PUBLIC_URL}" != https://* ]]; then
    echo "Não foi possível obter a URL pública do ngrok."
    echo "Últimas mensagens:"
    tail -20 "${NGROK_LOG}"
    exit 1
fi

set_env_value "BACKEND_PUBLIC_URL" "${PUBLIC_URL}" "${BACKEND_ENV}"

echo "Webhook configurado em:"
echo "  ${PUBLIC_URL}/api/pagamentos/webhook/"
echo "Painel local do ngrok:"
echo "  http://127.0.0.1:4040"
echo

(
    cd "${BACKEND_DIR}"
    exec "${BACKEND_DIR}/venv/bin/python" manage.py runserver "0.0.0.0:${BACKEND_PORT}"
) &
BACKEND_PID=$!

(
    cd "${PROJECT_DIR}"
    exec npm run dev
) &
FRONTEND_PID=$!

echo "Backend, frontend, Redis e túnel iniciados. Pressione Ctrl+C para encerrar todos."

if [[ -n "${REDIS_PID}" ]]; then
    wait -n "${NGROK_PID}" "${BACKEND_PID}" "${FRONTEND_PID}" "${REDIS_PID}"
else
    wait -n "${NGROK_PID}" "${BACKEND_PID}" "${FRONTEND_PID}"
fi
