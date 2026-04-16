# Frontend Socket Integration Guide

## Socket subscriptions

```js
socket.emit('joinStream', { actId });
socket.emit('chat:join', { chatId });

socket.on('newMessage', onStreamMessage);      // stream chat
socket.on('chat:message', onTeamMessage);      // team chat
socket.on('taskToggled', onTaskToggled);
socket.on('tasksSnapshotUpdated', onTasksSnapshot);
```

## Message deduplication

Use `message.id` as dedupe key.

`newMessage` payload in stream chat should contain:
- `id`
- `chatId`
- `createdAt`
- `sender`
- `text` or `content`

## Tasks update handlers

```js
function onTaskToggled(e) {
  // { actId, taskId, isCompleted, completedAt, updatedBy }
  if (e.actId !== currentActId) return;
  updateTask(e.taskId, e);
}

function onTasksSnapshot({ actId, tasks }) {
  if (actId !== currentActId) return;
  replaceTasks(tasks);
}
```

## Hero stream start and retry

```js
try {
  await api.post(`/act/${actId}/hero-streams/${heroUserId}/start`);
} catch (e) {
  const data = e.response?.data;
  if (data?.errorCode === 'STREAM_RESTART_IN_PROGRESS') {
    setTimeout(() => retryStart(), (data.retryAfterSec ?? 2) * 1000);
  }
}
```

## Team chat contract

Use `POST /chat/act-team/:actId` as find-or-create.
After receiving `chatId`, always call:

```js
socket.emit('chat:join', { chatId });
```
