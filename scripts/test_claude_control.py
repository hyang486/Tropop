import datetime as dt
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import claude_control as c


class ControllerTests(unittest.TestCase):
    def call(self):
        return {'input': {'project_id': c.PROJECT, 'query': 'begin; select 1; rollback;'},
                'session': 'a' * 36, 'id': 'tool-1', 'hash': 'abc',
                'timestamp': dt.datetime.now(dt.timezone.utc).isoformat()}

    def test_expired_and_wrong_project_are_not_eligible(self):
        call = self.call()
        self.assertTrue(c.eligible(call))
        call['timestamp'] = '2020-01-01T00:00:00+00:00'
        self.assertFalse(c.eligible(call))
        call = self.call()
        call['input']['project_id'] = 'another-project'
        self.assertFalse(c.eligible(call))

    def test_secret_is_not_sent_to_reviewer(self):
        call = self.call()
        call['input']['query'] = "select 'AKIAABCDEFGHIJKLMNOP';"
        self.assertFalse(c.eligible(call))

    def test_permission_denial_and_wrong_selection_are_not_sql_forms(self):
        text = f'MCP server “plugin:supabase:supabase” requests your input\nThis SQL includes destructive operations\nRun it on project {c.PROJECT}?\n❯ Accept    Decline'
        self.assertTrue(c.confirmation(text))
        self.assertFalse(c.confirmation(text.replace(c.PROJECT, 'other')))
        self.assertFalse(c.confirmation(text.replace('❯ Accept    Decline', 'Accept ❯ Decline')))
        self.assertFalse(c.confirmation('Auto mode denied external code. Allow?'))

    def test_never_submit_a_draft(self):
        self.assertTrue(c.empty_prompt('❯ \n────────\nstatus'))
        self.assertFalse(c.empty_prompt('❯ commit this\n────────\nstatus'))
        self.assertFalse(c.empty_prompt('❯ \nwrapped draft\n────────'))

    def test_permission_capture_contains_exact_path(self):
        text = 'Read outside the working directories\nRead(/tmp/sim.png)\nAllow this read outside the working directories?\n❯ 1. Yes, and keep allowing any reads outside the working directories\n4. Yes, but ask again next time\nEsc to cancel\nchanging footer'
        request = c.permission_request({'sessionId': 'a' * 36}, text)
        self.assertEqual(request['kind'], 'outside_read')
        self.assertIn('Read(/tmp/sim.png)', request['form'])
        self.assertNotIn('changing footer', request['form'])

    def test_unknown_permission_is_not_approved(self):
        agent = {'name': 'developer', 'sessionId': 'a' * 36}
        request = c.permission_request(agent, 'Approve a command?')
        with tempfile.TemporaryDirectory() as d, patch.object(c, 'STATE', Path(d)), \
                patch.object(c, 'notify'), patch.object(c, 'run') as run:
            c.handle_permission(agent, '%0', request)
            run.assert_not_called()

    def test_read_permission_uses_once_option_only(self):
        agent = {'name': 'developer', 'sessionId': 'a' * 36, 'pid': 123,
                 'waitingFor': 'permission prompt'}
        text = 'Read outside the working directories\nRead(/tmp/sim.png)\nAllow this read outside the working directories?\n❯ 1. Yes, and keep allowing any reads outside the working directories\n4. Yes, but ask again next time\nEsc to cancel'
        request = c.permission_request(agent, text)
        def fake_review(args, **kwargs):
            Path(args[args.index('-o') + 1]).write_text(json.dumps({'decision': 'approve', 'reason': 'Test screenshot'}))
            return type('Result', (), {'returncode': 0})()
        with tempfile.TemporaryDirectory() as d, patch.object(c, 'STATE', Path(d)), \
                patch.object(c, 'permission_evidence', return_value=[]), \
                patch.object(c.subprocess, 'run', side_effect=fake_review), \
                patch.object(c, 'agents', return_value=[agent]), patch.object(c, 'pane_for', return_value='%0'), \
                patch.object(c, 'screen', return_value=text), patch.object(c, 'run') as run:
            c.handle_permission(agent, '%0', request)
            run.assert_called_once_with(['tmux', 'send-keys', '-t', '%0', 'Down', 'Down', 'Down', 'Enter'])

    def test_approval_requires_unchanged_request(self):
        a = {'name': 'developer', 'sessionId': 'a' * 36, 'pid': 123, 'status': 'waiting'}
        call = self.call()
        with tempfile.TemporaryDirectory() as d, patch.object(c, 'STATE', Path(d)), \
                patch.object(c, 'review', return_value={'decision': 'approve', 'reason': 'Reviewed'}), \
                patch.object(c, 'agents', return_value=[a]), patch.object(c, 'pane_for', return_value='%0'), \
                patch.object(c, 'pending', return_value={**call, 'hash': 'changed'}), \
                patch.object(c, 'run') as run:
            c.handle(a, '%0', call)
            run.assert_not_called()

    def test_approval_submits_one_enter_only(self):
        a = {'name': 'developer', 'sessionId': 'a' * 36, 'pid': 123, 'status': 'waiting'}
        call = self.call()
        with tempfile.TemporaryDirectory() as d, patch.object(c, 'STATE', Path(d)), \
                patch.object(c, 'review', return_value={'decision': 'approve', 'reason': 'Reviewed'}), \
                patch.object(c, 'agents', return_value=[a]), patch.object(c, 'pane_for', return_value='%0'), \
                patch.object(c, 'pending', return_value=call), patch.object(c, 'screen', return_value='form'), \
                patch.object(c, 'confirmation', return_value=True), patch.object(c, 'run') as run:
            c.handle(a, '%0', call)
            run.assert_called_once_with(['tmux', 'send-keys', '-t', '%0', 'Enter'])


if __name__ == '__main__':
    unittest.main()
