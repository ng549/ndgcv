import { useLocalSearchParams } from 'expo-router';
import { Screen, Card, Heading, Copy, ApprovalList } from '../components';
import { useCommand } from '../store';
export default function Job() {
  const { id } = useLocalSearchParams<{ id: string }>(); const { jobs } = useCommand(); const job = jobs.find(j => j.id === id);
  return <Screen title="Work details">{job ? <><Card><Heading>{job.title}</Heading><Copy>{job.status}</Copy><Copy>{job.instruction}</Copy><Copy>{job.branch ?? 'Branch not assigned'}</Copy><Copy>Results and CI: not available</Copy></Card><ApprovalList packetId={job.id} /></> : <Card><Copy>Work is unavailable. Preview records clear when the app restarts.</Copy></Card>}</Screen>;
}
