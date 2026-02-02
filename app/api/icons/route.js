import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const iconsDir = path.join(process.cwd(), 'public', 'icons', 'categories');
    
    if (!fs.existsSync(iconsDir)) {
      return NextResponse.json({ icons: [] });
    }

    const files = fs.readdirSync(iconsDir);
    const svgFiles = files.filter(file => file.toLowerCase().endsWith('.svg'));
    
    // Create full paths for the frontend to use
    const icons = svgFiles.map(file => ({
      name: file,
      path: `/icons/categories/${file}`
    }));

    return NextResponse.json({ icons });
  } catch (error) {
    console.error('Error reading icons:', error);
    return NextResponse.json({ error: 'Failed to fetch icons' }, { status: 500 });
  }
}
