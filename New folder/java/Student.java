public class Student {
    private final String name;
    private final int rollNumber;

    public Student(String name, int rollNumber) {
        this.name = name;
        this.rollNumber = rollNumber;
    }

    public String getName() { return name; }
    public int getRollNumber() { return rollNumber; }

    public static void main(String[] args) {
        Student student = new Student("Asha", 101);
        System.out.println(student.getName() + " - " + student.getRollNumber());
    }
}
