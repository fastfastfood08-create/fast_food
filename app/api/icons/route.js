import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function GET() {
  try {
    const iconsDir = path.join(process.cwd(), 'public', 'icons', 'categories');
    
    // Check if dir exists
    try {
        await fs.access(iconsDir);
    } catch {
        return NextResponse.json({ icons: [] });
    }

    const files = await fs.readdir(iconsDir);
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
