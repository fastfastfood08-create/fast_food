import { NextResponse } from 'next/server';
import { revalidateTag, unstable_cache } from 'next/cache';
import prisma from '@/app/lib/prisma';

const getMeals = unstable_cache(
    async () => {
        return await prisma.meal.findMany({
            select: {
                id: true,
                name: true,
                description: true,
                image: true,
                price: true,
                categoryId: true,
                active: true,
                popular: true,
                order: true,
                hasSizes: true,
                sizes: {
                    select: { id: true, name: true, price: true }
                },
                category: {
                    select: { id: true, name: true }
                }
            },
            orderBy: { order: 'asc' }
        });
    },
    ['meals-all-cache'],
    { tags: ['meals'] }
);

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get('categoryId');
    
    // Safety check if database is reachable
    try {
        await prisma.$queryRaw`SELECT 1`;
    } catch(dbError) {
        console.error("Database connection check failed:", dbError);
        // Fallback to empty array if DB is down, to prevent 500 crash effectively
        return NextResponse.json([]); 
    }

    const meals = await getMeals();
    
    if (categoryId) {
        const filtered = meals.filter(m => m.categoryId === parseInt(categoryId));
        return NextResponse.json(filtered);
    }
    
    return NextResponse.json(meals);
  } catch (error) {
    console.error("GET /api/meals error:", error);
    return NextResponse.json({ error: 'Failed to fetch meals' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    console.log("POST /api/meals body:", JSON.stringify(body));
    
    // Validate required fields
    if (!body.name || body.name.trim() === '') {
      return NextResponse.json({ error: 'اسم الوجبة مطلوب' }, { status: 400 });
    }

    const catId = parseInt(body.categoryId);
    if (!body.categoryId || isNaN(catId)) {
      return NextResponse.json({ error: 'القسم مطلوب' }, { status: 400 });
    }

    const price = parseFloat(body.price);
    const safePrice = isNaN(price) ? 0 : price;

    let meal; 

    // Prepare sizes safely
    const prepareSizes = (sizes) => {
        if (!sizes || !Array.isArray(sizes)) return [];
        return sizes.map(s => {
            const p = parseFloat(s.price);
            return {
                name: s.name || 'size',
                price: isNaN(p) ? 0 : p
            };
        });
    };

    // ID exists -> Update
    if (body.id) {
        const id = parseInt(body.id);
        if (isNaN(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

        // Handle sizes update (delete old, create new is simplest strategy for now)
        if (body.sizes !== undefined) {
             // Transaction would be better but simple sequential for now
            await prisma.mealSize.deleteMany({ where: { mealId: id }});
        }
        
        meal = await prisma.meal.update({
            where: { id: id },
            data: {
                name: body.name,
                description: body.description || '',
                image: body.image || null,
                price: safePrice,
                categoryId: catId,
                active: body.active !== undefined ? body.active : true,
                popular: body.popular || false,
                hasSizes: body.hasSizes || false,
                sizes: body.sizes && body.sizes.length > 0 ? {
                    create: prepareSizes(body.sizes)
                } : undefined
            },
            include: { sizes: true }
        });
    } else {
        // Create
        meal = await prisma.meal.create({
            data: {
                name: body.name,
                description: body.description || '',
                image: body.image || null,
                price: safePrice,
                categoryId: catId,
                active: body.active !== undefined ? body.active : true,
                popular: body.popular || false,
                hasSizes: body.hasSizes || false,
                order: parseInt(body.order) || 0,
                sizes: {
                    create: prepareSizes(body.sizes)
                }
            },
            include: { sizes: true }
        });
    }
    
    revalidateTag('meals');
    return NextResponse.json(meal);
  } catch (error) {
    console.error("Meal Save Error:", error);
    return NextResponse.json({ 
      error: 'فشل في حفظ الوجبة: ' + (error.message || 'Unknown error')
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
        if(isNaN(numericId)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

        // 1. Get the meal first to find image path
        const meal = await prisma.meal.findUnique({
            where: { id: numericId },
            select: { image: true }
        });

        if (meal && meal.image) {
            // Check if it's a local upload
            if (meal.image.startsWith('/uploads/')) {
                 const fs = require('fs/promises');
                 const path = require('path');
                 // Image path is relative to public folder
                 // meal.image is like "/uploads/meals/xyz.jpg"
                 const filePath = path.join(process.cwd(), 'public', meal.image);
                 
                 try {
                     await fs.unlink(filePath);
                     console.log(`Deleted image file: ${filePath}`);
                 } catch (err) {
                     console.warn(`Failed to delete image file: ${filePath}`, err);
                     // Continue to delete record anyway
                 }
            }
        }

        await prisma.meal.delete({
            where: { id: numericId }
        });
        
        revalidateTag('meals');
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Meal Delete Error:", error);
        return NextResponse.json({ error: 'Failed to delete meal' }, { status: 500 });
    }
}
