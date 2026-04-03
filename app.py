"""
CyberGuard Flask Application — runs on Windows, connects to Ollama on Mac.
"""

import os
import json
import dataclasses
from flask import Flask, request, jsonify, Response, stream_with_context, redirect
from flask_socketio import SocketIO
from flask_login import login_required, current_user, login_user, logout_user
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
app.secret_key = os.getenv('SECRET_KEY', 'cyberguard-secret-2025')

CORS(app, supports_credentials=True, origins=['http://localhost:5173', 'http://localhost:3000'])
socketio = SocketIO(app, cors_allowed_origins='*', async_mode='threading')

from auth import setup_auth, requires_permission, authenticate
from orchestrator import SOCOrchestrator
from llm_engine import stream_response, check_connection
from live_stream import start_live_stream
from memory import InvestigationMemory
from agents.threat_agent import ThreatDetectionEngine
from collectors.winlog_collector import WindowsEventLogCollector
from collectors.network_collector import NetworkCollector
from collectors.ip_enricher import IPEnricher
from safety import SafetyLayer
from simulators.attack_sim import AttackSimulator

# ── Init ──────────────────────────────────────────────────────────────────────
login_manager = setup_auth(app)
orchestrator   = SOCOrchestrator()
memory         = InvestigationMemory()
threat_engine  = ThreatDetectionEngine()
winlog         = WindowsEventLogCollector()
netcol         = NetworkCollector()
enricher       = IPEnricher()
safety         = SafetyLayer()
simulator      = AttackSimulator()

start_live_stream(socketio, winlog)


# ── Auth routes ───────────────────────────────────────────────────────────────

@app.route('/api/auth/login', methods=['POST'])
def api_login():
    data = request.json or {}
    user = authenticate(data.get('username', ''), data.get('password', ''))
    if not user:
        return jsonify({'error': 'Invalid credentials'}), 401
    login_user(user, remember=True)
    return jsonify({'id': user.id, 'name': user.name, 'role': user.role, 'username': user.username})


@app.route('/api/auth/logout', methods=['POST'])
@login_required
def api_logout():
    logout_user()
    return jsonify({'ok': True})


@app.route('/api/auth/me')
@login_required
def api_me():
    return jsonify({'id': current_user.id, 'name': current_user.name,
                    'role': current_user.role, 'username': current_user.username})


# ── Chat ──────────────────────────────────────────────────────────────────────

@app.route('/api/chat', methods=['POST'])
@login_required
@requires_permission('chat')
def api_chat():
    data = request.json or {}
    query = data.get('query', '').strip()
    mode  = data.get('mode', 'briefing')
    if not query:
        return jsonify({'error': 'Empty query'}), 400

    def generate():
        result = orchestrator.process(query, mode, session_id=str(current_user.id))

        if not result['safe']:
            yield f"data: {json.dumps({'type': 'chunk', 'text': result['response']})}\n\n"
            yield f"data: {json.dumps({'type': 'done'})}\n\n"
            return

        # Send metadata (evidence, sources, threats, agent_trace)
        meta = {
            'type': 'metadata',
            'sources': result['sources'],
            'evidence': result['evidence'],
            'threats': result['threats'],
            'confidence': result['confidence'],
            'soar_playbook': result.get('soar_playbook'),
            'agent_trace': result.get('agent_trace', []),
            'intent': result['intent'],
        }
        yield f"data: {json.dumps(meta)}\n\n"

        # Stream LLM response
        full_text = ''
        for chunk in stream_response(query, result['evidence'], mode):
            full_text += chunk
            yield f"data: {json.dumps({'type': 'chunk', 'text': chunk})}\n\n"

        # Hallucination check
        check = safety.validate_output(full_text, result['evidence'])
        if check['disclaimer']:
            yield f"data: {json.dumps({'type': 'chunk', 'text': check['disclaimer']})}\n\n"

        # Auto-save HIGH threat findings
        if any(t.get('severity') == 'HIGH' for t in result.get('threats', [])):
            memory.save_finding_auto(query, full_text, result['evidence'], result['threats'])

        yield f"data: {json.dumps({'type': 'done', 'confidence': check['confidence']})}\n\n"

    return Response(
        stream_with_context(generate()),
        mimetype='text/event-stream',
        headers={'X-Accel-Buffering': 'no', 'Cache-Control': 'no-cache'},
    )


# ── Status & Stats ────────────────────────────────────────────────────────────

@app.route('/api/status')
@login_required
def api_status():
    return jsonify({
        'ollama': check_connection(),
        'event_log': {'connected': True},
        'threats_24h': len(threat_engine.run_all_rules(24)),
    })


@app.route('/api/stats')
@login_required
@requires_permission('dashboard')
def api_stats():
    return jsonify(winlog.get_summary_stats())


# ── Threats ───────────────────────────────────────────────────────────────────

@app.route('/api/threats')
@login_required
@requires_permission('threats')
def api_threats():
    hours = request.args.get('hours', 24, type=int)
    threats = threat_engine.run_all_rules(hours)
    return jsonify([dataclasses.asdict(t) for t in threats])


# ── Events ────────────────────────────────────────────────────────────────────

@app.route('/api/events')
@login_required
@requires_permission('logs')
def api_events():
    hours    = request.args.get('hours', 24, type=int)
    event_id = request.args.get('event_id', type=int)
    events   = winlog.get_recent_events(hours=hours, event_ids=[event_id] if event_id else None)
    return jsonify([e.to_dict() for e in events[:200]])


# ── IP Intelligence ───────────────────────────────────────────────────────────

@app.route('/api/ip/<ip>')
@login_required
def api_ip(ip):
    info = enricher.enrich(ip)
    return jsonify(dataclasses.asdict(info))


# ── Network ───────────────────────────────────────────────────────────────────

@app.route('/api/network')
@login_required
@requires_permission('dashboard')
def api_network():
    conns = netcol.get_live_connections()
    return jsonify([dataclasses.asdict(c) for c in conns[:50]])


# ── Timeline ──────────────────────────────────────────────────────────────────

@app.route('/api/timeline/<ip>')
@login_required
@requires_permission('timeline')
def api_timeline(ip):
    from agents.timeline_agent import TimelineAgent
    tl = TimelineAgent().reconstruct(ip, winlog)
    return jsonify(tl)


# ── Cases ─────────────────────────────────────────────────────────────────────

@app.route('/api/cases', methods=['GET', 'POST'])
@login_required
def api_cases():
    if request.method == 'GET':
        return jsonify(memory.get_open_cases())
    data = request.json or {}
    case_id = memory.save_finding(
        query=data.get('query', ''),
        finding=data.get('finding', ''),
        evidence=data.get('evidence', {}),
        threats=data.get('threats', []),
        analyst=current_user.name,
    )
    return jsonify({'case_id': case_id})


@app.route('/api/cases/<case_id>', methods=['PATCH'])
@login_required
def api_case_update(case_id):
    data = request.json or {}
    memory.update_case_status(case_id, data.get('status', 'open'))
    return jsonify({'ok': True})


# ── Simulation ────────────────────────────────────────────────────────────────

@app.route('/api/simulate/<scenario>', methods=['POST'])
@login_required
@requires_permission('admin')
def api_simulate(scenario):
    result = simulator.inject(scenario)
    if 'error' in result:
        return jsonify(result), 400
    # Emit simulated events via SocketIO so live ticker shows them
    for ev in simulator.get_injected_events():
        socketio.emit('live_event', {
            'event_id': ev.event_id, 'timestamp': ev.timestamp,
            'event_type': ev.event_type, 'username': ev.username,
            'src_ip': ev.src_ip, 'severity': ev.severity,
            'description': f'[SIM] {ev.event_type} — {ev.username or "?"} from {ev.src_ip or "local"}',
        })
        if ev.severity == 'HIGH':
            socketio.emit('threat_detected', {
                'severity': ev.severity, 'rule_name': ev.event_type,
                'src_ip': ev.src_ip, 'username': ev.username, 'timestamp': ev.timestamp,
            })
    return jsonify(result)


@app.route('/api/simulate', methods=['GET'])
@login_required
def api_simulate_list():
    return jsonify(simulator.list_scenarios())


@app.route('/api/simulate/clear', methods=['POST'])
@login_required
@requires_permission('admin')
def api_simulate_clear():
    simulator.clear()
    return jsonify({'ok': True})


# ── Admin ─────────────────────────────────────────────────────────────────────

@app.route('/api/admin/injection-log')
@login_required
@requires_permission('admin')
def api_injection_log():
    return jsonify(memory.get_injection_log())


# ── SocketIO ──────────────────────────────────────────────────────────────────

@socketio.on('connect')
def on_connect():
    pass


@socketio.on('disconnect')
def on_disconnect():
    pass


# ── Run ───────────────────────────────────────────────────────────────────────

if __name__ == '__main__':
    port = int(os.getenv('FLASK_PORT', 5000))
    socketio.run(app, host='0.0.0.0', port=port, debug=True)
