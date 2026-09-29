import React, { type ReactNode, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Link } from 'expo-router';
import { useCommand } from './store';
export const colors = { bg: '#0B111A', panel: '#142030', ink: '#F3F6FC', muted: '#A5B3C6', accent: '#9CC5FF' };
export function Button({ title, onPress, disabled = false }: { title: string; onPress: () => void; disabled?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress}
    style={({ pressed }) => [s.button, { opacity: disabled ? 0.4 : pressed ? 0.7 : 1 }]}><Text style={s.buttonText}>{title}</Text></Pressable>;
}
export function Card({ children }: { children: ReactNode }) { return <View style={s.card}>{children}</View>; }
export function Copy({ children }: { children: ReactNode }) { return <Text style={s.copy}>{children}</Text>; }
export function Heading({ children }: { children: ReactNode }) { return <Text style={s.heading}>{children}</Text>; }
export function Screen({ title, children }: { title: string; children: ReactNode }) {
  const { preview } = useCommand();
  return <ScrollView style={s.screen} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
    <Text style={s.eyebrow}>THE AGENCY / NEXUS</Text><Text style={s.title}>{title}</Text>
    <View style={s.banner}><Text style={s.bannerText}>{preview ? 'PREVIEW · Example data · Nothing sent to Droid' : 'NOT CONNECTED · Live operations unavailable'}</Text></View>
    {children}
  </ScrollView>;
}
export function JobList({ devilOnly = false }: { devilOnly?: boolean }) {
  const { jobs } = useCommand(); const list = jobs.filter(j => !devilOnly || j.resource === 'Devil Up AI');
  return <>{list.length === 0 && <Card><Copy>No live work loaded. Connect the Agency service before issuing instructions.</Copy></Card>}
    {list.map(j => <Card key={j.id}><Text style={s.eyebrow}>{j.status} / NEXUS</Text><Heading>{j.title}</Heading>
      <Copy>{j.resource}</Copy><Copy>{j.branch ?? 'Branch not assigned'}</Copy><Copy>Cost: UNKNOWN</Copy>
      <Link style={s.link} href={{ pathname: '/job', params: { id: j.id } }}>Open work →</Link></Card>)}</>;
}
export function ApprovalList({ packetId }: { packetId?: string }) {
  const { approvals, decide } = useCommand(); const [reviewing, setReviewing] = useState<string | null>(null);
  const list = approvals.filter(a => !packetId || a.packetId === packetId);
  return <>{list.length === 0 && <Card><Copy>No approval records loaded. This is not confirmation that no approvals are waiting.</Copy></Card>}
    {list.map(a => <Card key={a.id}><Text style={s.eyebrow}>{a.kind === 'PROVIDER_PERMISSION' ? 'TOOL PERMISSION' : 'AGENCY REVIEW'} / {a.status}</Text>
      <Heading>{a.title}</Heading><Copy>Project: {a.projectId} · Packet: {a.packetId}</Copy><Copy>{a.detail}</Copy>
      <Copy>Expires: {new Date(a.expiresAt).toLocaleTimeString()}</Copy>
      {a.status === 'PENDING' && (reviewing === a.id ? <><Copy>Confirm this one example action? This does not accept the finished work.</Copy>
        <Button title="Confirm preview approval once" onPress={() => { decide(a.id, a.version, 'APPROVED'); setReviewing(null); }} />
        <Button title="Back" onPress={() => setReviewing(null)} /></> : <>
        <Button title="Review approval" onPress={() => setReviewing(a.id)} />
        <Button title="Reject preview request" onPress={() => decide(a.id, a.version, 'REJECTED')} /></>)}
    </Card>)}</>;
}
export function Composer() {
  const { preview, draft } = useCommand(); const [text, setText] = useState(''); const [notice, setNotice] = useState('');
  return <Card><Heading>Give an instruction</Heading><Copy>Nexus · Devil Up AI</Copy>
    <TextInput accessibilityLabel="Instruction for Nexus" placeholder="What should we work on?" placeholderTextColor={colors.muted}
      multiline maxLength={4000} value={text} onChangeText={setText} style={s.input} />
    <Button title={preview ? 'Create preview draft' : 'Connect to send'} disabled={!preview || !text.trim()}
      onPress={() => { draft(text); setText(''); setNotice('Preview draft created in memory. Nothing sent or launched.'); }} />
    {!!notice && <Text accessibilityLiveRegion="polite" style={s.copy}>{notice}</Text>}
  </Card>;
}
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg }, content: { padding: 20, paddingBottom: 40, gap: 16, maxWidth: 840, width: '100%', alignSelf: 'center' },
  eyebrow: { color: colors.accent, fontSize: 11, fontWeight: '700', letterSpacing: 1.4 },
  title: { color: colors.ink, fontSize: 34, fontWeight: '700' }, heading: { color: colors.ink, fontSize: 21, fontWeight: '600' },
  copy: { color: colors.muted, fontSize: 16, lineHeight: 24 },
  card: { padding: 20, gap: 12, borderRadius: 20, backgroundColor: colors.panel, borderWidth: 1, borderColor: '#293C55' },
  banner: { padding: 12, backgroundColor: '#322B17', borderRadius: 12 }, bannerText: { color: '#F3DDA0', fontSize: 13 },
  button: { minHeight: 48, padding: 14, borderRadius: 12, backgroundColor: '#B7D3FF', justifyContent: 'center' },
  buttonText: { color: '#102440', fontWeight: '700', fontSize: 16, textAlign: 'center' },
  input: { color: colors.ink, borderColor: '#476182', borderWidth: 1, padding: 14, borderRadius: 12, minHeight: 120, textAlignVertical: 'top', fontSize: 17 },
  link: { color: colors.accent, fontSize: 16, paddingVertical: 12 }
});
