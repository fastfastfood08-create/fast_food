import { NextResponse } from 'next/server';
import { revalidateTag, unstable_cache } from 'next/cache';
import prisma from '@/app/lib/prisma';

const getAllCategories = unstable_cache(
    async () => {
        return await prisma.category.findMany({
            select: { id: true, name: true, icon: true, order: true, active: true },
            orderBy: { order: 'asc' }
        });
    },
    ['categories-all'],
    { tags: ['categories'] }
);

const getActiveCategories = unstable_cache(
    async () => {
        return await prisma.category.findMany({
            select: { id: true, name: true, icon: true, order: true, active: true },
            orderBy: { order: 'asc' },
            where: { active: true }
        });
    },
    ['categories-active'],
    { tags: ['categories'] }
);

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const includeAll = searchParams.get('all') === 'true';
    
    const categories = includeAll ? await getAllCategories() : await getActiveCategories();
    return NextResponse.json(categories);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    console.log("POST /api/categories body:", JSON.stringify(body));
    
    if (!body.name || body.name.trim() === '') {
      return NextResponse.json({ error: 'اسم القسم مطلوب' }, { status: 400 });
    }
    
    let category;
    if (body.id) {
        const id = parseInt(body.id);
        if (isNaN(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

        category = await prisma.category.update({
            where: { id: id },
            data: {
                name: body.name,
                icon: body.icon || '📁',
                active: body.active !== undefined ? body.active : true
            }
        });
    } else {
        category = await prisma.category.create({
            data: {
                name: body.name,
                icon: body.icon || '📁',
                order: parseInt(body.order) || 0,
                active: body.active !== undefined ? body.active : true
            }
        });
    }
    
    revalidateTag('categories');
    return NextResponse.json(category);
  } catch (error) {
    console.error("Category Save Error:", error);
    return NextResponse.json({ 
      error: 'فشل في حفظ القسم'
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
        const numericId = parseInt(id);
        if (isNaN(numericId)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

        await prisma.category.delete({
            where: { id: numericId }
        });
        revalidateTag('categories');
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Category Delete Error:", error);
        return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
    }
}
