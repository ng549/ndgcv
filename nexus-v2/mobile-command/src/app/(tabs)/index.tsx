import { Screen, Card, Heading, Copy, Button, Composer } from '../../components';
import { useCommand } from '../../store';
export default function Agency() {
  const { preview, jobs, approvals, togglePreview } = useCommand();
  return <Screen title="Agency View"><Card><Heading>Your business, within reach.</Heading>
    <Copy>Direct work, review decisions, and see what needs you.</Copy>
    <Copy>{preview ? `${jobs.length} example jobs · ${approvals.filter(a => a.status === 'PENDING').length} example approvals` : 'Sign-in and live connection are not yet available in this build.'}</Copy>
    <Button title={preview ? 'Exit preview and clear examples' : 'Explore the preview'} onPress={togglePreview} />
  </Card><Composer /><Card><Heading>One workspace, room to grow</Heading><Copy>Client jobs, sales, money, and business operations will share this Agency View as their services are integrated.</Copy></Card></Screen>;
}
