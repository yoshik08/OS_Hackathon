public class LinearSearch {
    static int search(int[] values, int target) {
        for (int i = 0; i < values.length; i++) {
            if (values[i] == target) return i;
        }
        return -1;
    }
    public static void main(String[] args) {
        System.out.println(search(new int[]{4, 8, 2, 9}, 2));
    }
}
