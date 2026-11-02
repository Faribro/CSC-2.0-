import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function HomePage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('csc_token')?.value;

  if (token && token.trim().length > 0) {
    redirect('/work');
  } else {
    redirect('/sign-in');
  }
}
