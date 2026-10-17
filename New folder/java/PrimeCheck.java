public class PrimeCheck {
    static boolean isPrime(int n) {
        if (n < 2) return false;
        for (int d = 2; d * d <= n; d++) {
            if (n % d == 0) return false;
        }
        return true;
    }
    public static void main(String[] args) {
        for (int n = 2; n < 30; n++) if (isPrime(n)) System.out.print(n + " ");
    }
}
