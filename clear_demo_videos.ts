import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import firebaseConfig from './firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function main() {
  console.log('Fetching videos from Firestore...');
  const snap = await getDocs(collection(db, 'videos'));
  console.log(`Found ${snap.size} videos.`);
  for (const d of snap.docs) {
    console.log(`Deleting ${d.id} (${d.data().title})...`);
    await deleteDoc(doc(db, 'videos', d.id));
  }
  console.log('All demo videos removed successfully!');
  process.exit(0);
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
