import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@flowfoundry/db";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
  try {
    const { name, email, password, company } = await request.json();

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return NextResponse.json(
        { message: "User already exists with this email" },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword
      }
    });

    // Always create a default organization for the user
    const orgName = company || `${name || email.split('@')[0]}'s Organization`;
    const baseSlug = orgName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const slug = baseSlug;
    let org = await prisma.organization.findUnique({
      where: { slug }
    });

    // If organization with this slug exists, find or create a unique one
    if (!org) {
      try {
        org = await prisma.organization.create({
          data: {
            name: orgName,
            slug: slug,
          }
        });
      } catch (error: any) {
        // If slug still conflicts, try with a unique suffix
        if (error.code === 'P2002' && error.meta?.target?.includes('slug')) {
          let counter = 1;
          let uniqueSlug = `${slug}-${counter}`;
          let foundUnique = false;
          
          while (!foundUnique && counter < 100) {
            const existing = await prisma.organization.findUnique({
              where: { slug: uniqueSlug }
            });
            
            if (!existing) {
              foundUnique = true;
            } else {
              counter++;
              uniqueSlug = `${slug}-${counter}`;
            }
          }
          
          org = await prisma.organization.create({
            data: {
              name: orgName,
              slug: uniqueSlug,
            }
          });
        } else {
          throw error;
        }
      }
    }

    // Add user as owner of the organization
    await prisma.membership.create({
      data: {
        userId: user.id,
        orgId: org.id,
        role: "OWNER"
      }
    });

    // Create a default subscription for the organization
    await prisma.subscription.upsert({
      where: { id: org.id },
      update: {},
      create: {
        id: org.id,
        orgId: org.id,
        plan: "FREE",
        status: "active"
      }
    });

    return NextResponse.json({ success: true, userId: user.id });
  } catch (error) {
    console.error("Signup error:", error);
    // Return more detailed error message in development
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      { message: process.env.NODE_ENV === "development" ? errorMessage : "Internal server error" },
      { status: 500 }
    );
  }
}
