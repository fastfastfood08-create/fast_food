import { NextResponse } from 'next/server';
import prisma from '@/app/lib/prisma';

export async function GET(request) {
  try {
    // Check if admin request (include inactive)
    const { searchParams } = new URL(request.url);
    const includeAll = searchParams.get('all') === 'true';
    
    const categories = await prisma.category.findMany({
      orderBy: { order: 'asc' },
      ...(includeAll ? {} : { where: { active: true } })
    });
    return NextResponse.json(categories);
  } catch (error) {
    console.error('GET /api/categories error:', error);
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    
    console.log('POST /api/categories - received:', JSON.stringify(body).substring(0, 500));
    
    // Validate required fields
    if (!body.name || body.name.trim() === '') {
      return NextResponse.json({ error: 'اسم القسم مطلوب' }, { status: 400 });
    }
    
    // Check if ID exists -> Update
    if (body.id) {
        const category = await prisma.category.update({
            where: { id: body.id },
            data: {
                name: body.name,
                icon: body.icon || '📁',
                active: body.active !== undefined ? body.active : true
            }
        });
        console.log('Category updated:', category.id);
        return NextResponse.json(category);
    }

    // Create new category
    const category = await prisma.category.create({
      data: {
        name: body.name,
        icon: body.icon || '📁',
        order: body.order || 0,
        active: body.active !== undefined ? body.active : true
      }
    });
    console.log('Category created:', category.id);
    return NextResponse.json(category);
  } catch (error) {
    console.error('POST /api/categories error:', error);
    return NextResponse.json({ 
      error: 'فشل في حفظ القسم: ' + (error.message || 'خطأ غير معروف')
    }, { status: 500 });
  }
}

export async function DELETE(request) {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
        return NextResponse.json({ error: 'ID required' }, { status: 400 });
    }

    try {
        await prisma.category.delete({
            where: { id: parseInt(id) }
        });
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
    }
}
