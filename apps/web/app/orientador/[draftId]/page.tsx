import { CounselorReview } from '../../../components/counselor/CounselorReview';

export default async function CounselorDraftPage({ params }: { params: Promise<{ draftId: string }> }) {
  const { draftId } = await params;
  return (
    <main>
      <CounselorReview draftId={draftId} />
    </main>
  );
}
