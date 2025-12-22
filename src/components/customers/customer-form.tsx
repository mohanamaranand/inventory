
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet";
import { useInventory } from "@/context/inventory-context-firebase";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";

const formSchema = z.object({
  name: z.string().min(1, "Customer name is required."),
  contactPerson: z.string().min(1, "Contact person is required."),
  phone: z.string().min(1, "Phone number is required."),
  email: z.string().email("Invalid email address."),
  address: z.string().min(1, "Address is required."),
  gstNumber: z.string().optional(),
  aadharNumber: z.string().optional(),
});

type CustomerFormProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFormSubmit: () => void;
  customerId?: string | null;
};

export function CustomerForm({
  open,
  onOpenChange,
  onFormSubmit,
  customerId,
}: CustomerFormProps) {
  const { addCustomer, updateCustomer, getCustomer } = useInventory();
  const { toast } = useToast();
  
  const editingCustomer = customerId ? getCustomer(customerId) : null;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
        name: "",
        contactPerson: "",
        phone: "",
        email: "",
        address: "",
        gstNumber: "",
        aadharNumber: "",
      },
  });

  useEffect(() => {
    if (editingCustomer) {
      form.reset({
        ...editingCustomer,
        gstNumber: editingCustomer.gstNumber || "",
        aadharNumber: editingCustomer.aadharNumber || "",
      });
    } else {
      form.reset({
        name: "",
        contactPerson: "",
        phone: "",
        email: "",
        address: "",
        gstNumber: "",
        aadharNumber: "",
      });
    }
  }, [editingCustomer, form, open]);

  function onSubmit(values: z.infer<typeof formSchema>) {
    const customerData = {
      ...values,
      gstNumber: values.gstNumber || "0000",
      aadharNumber: values.aadharNumber || "0000",
    };

    if (editingCustomer && customerId) {
      updateCustomer(customerId, customerData);
      toast({ title: "Customer Updated", description: `"${values.name}" has been updated.` });
    } else {
      addCustomer(customerData);
      toast({ title: "Customer Added", description: `"${values.name}" has been added.` });
    }
    onFormSubmit();
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg w-full overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{editingCustomer ? "Edit Customer" : "Add New Customer"}</SheetTitle>
          <SheetDescription>
            {editingCustomer
              ? "Update the details of the existing customer."
              : "Fill in the details to add a new customer."}
          </SheetDescription>
        </SheetHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Company Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., City Dealers Inc." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="contactPerson"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact Person</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., John Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl>
                        <Input placeholder="+1 234 567 890" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                        <Input type="email" placeholder="contact@citydealers.com" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
            </div>
             <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                        <Textarea placeholder="123 Main Street, Anytown, USA" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="gstNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>GST Number</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., 29AABCU9517R1Z0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="aadharNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Aadhar Number</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., 1234 5678 9012" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
            </div>

            <SheetFooter>
                <SheetClose asChild>
                    <Button type="button" variant="outline">Cancel</Button>
                </SheetClose>
                <Button type="submit">Save Changes</Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
